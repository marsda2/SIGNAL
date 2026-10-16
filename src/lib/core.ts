// Server-only. SurrealDB **Core**: the authoritative incidents / action attempts / audit log.
// Kept separate from Agent Memory (src/lib/memory.ts): inferred memory never sets an incident status.
// Without SURREALDB_* credentials it falls back to an in-process store that is clearly labelled `local`
// (fine for `npm run web`; NOT durable on Vercel, where each lambda has its own memory).
import { Surreal } from 'surrealdb';

import fixtures from '@/data/demo-fixtures.json';
import demoSpaces from '@/data/demo-spaces.json';
import type { IncidentView } from '@/lib/agent/contracts';

export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
export type IncidentNote = { at: string; by: string; text: string };
export type Incident = {
  key: string;
  locationId: string;
  assetId: string | null;
  status: IncidentStatus;
  summary: string;
  reportedAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  resolution?: string | null;
  source: 'fixture' | 'visitor' | 'portal';
  notes: IncidentNote[];
};

export type ActionState = 'PENDING' | 'INITIATED' | 'VERIFIED' | 'FAILED' | 'PENDING_REVIEW';
export type ActionAttempt = {
  key: string;
  kind: 'PORTAL_UPDATE' | 'CREATE_INCIDENT' | 'MAINTENANCE_CALL';
  callSid?: string | null;
  incidentKey: string;
  locationId: string;
  state: ActionState;
  requestedStatus: IncidentStatus;
  reference: string; // nonce the agent must write into the portal; read-back looks for it
  note: string;
  anchorSessionId?: string | null;
  liveViewUrl?: string | null;
  workflowId?: string | null;
  agentResult?: string | null;
  evidence?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuditEvent = { at: string; kind: string; actor: string; subject: string; detail: string };

export type CoreBackend = 'surrealdb' | 'local';

export const toView = (i: Incident): IncidentView => ({
  key: i.key,
  status: i.status,
  summary: i.summary,
  reportedAt: i.reportedAt,
  updatedAt: i.updatedAt,
  source: i.source,
  lastNote: i.notes.at(-1)?.text,
});

const now = () => new Date().toISOString();

export type SpaceAsset = { id: string; type: string; name: string; model?: string; safeTroubleshooting: string[] };
export type SpaceFaq = { q: string; a: string };
export type SpaceEscalation = {
  urgentPhone: string | null;
  urgentLabel?: string | null;
  email: string | null;
  /** signal_demo = our owned /demo/maintenance (Anchor allowed); external = link only; none = no portal. */
  portal: 'signal_demo' | 'external' | 'none';
  portalUrl: string | null;
  hours?: string | null;
};
export type Space = {
  id: string;
  name: string;
  siteName: string;
  description: string;
  timezone: string;
  assets: SpaceAsset[];
  faqs: SpaceFaq[];
  escalation: SpaceEscalation;
  nfcTags: string[];
  /** nfc = visitor APIs only work with a session from a verified chip tap; open = anyone with the link. */
  access?: 'nfc' | 'open';
  updatedAt?: string;
};

export const DEFAULT_SPACE_ID = demoSpaces.defaultSpaceId;

function fixtureSpaces(): Space[] {
  return (demoSpaces.spaces as Space[]).map((s) => ({ ...s, updatedAt: now() }));
}

/** Pitch Area reports use relative dates so "reported N days ago" stays true whenever the demo is reset. */
function pastReportIncidents(): Incident[] {
  const day = 24 * 60 * 60 * 1000;
  return demoSpaces.pastReports.map((r) => {
    const reported = new Date(Date.now() - r.reportedDaysAgo * day - 3 * 60 * 60 * 1000);
    const resolved = 'resolvedAfterMinutes' in r && r.resolvedAfterMinutes ? new Date(reported.getTime() + r.resolvedAfterMinutes * 60 * 1000).toISOString() : null;
    return {
      key: r.id,
      locationId: r.spaceId,
      assetId: r.assetId,
      status: r.status as IncidentStatus,
      summary: r.summary,
      reportedAt: reported.toISOString(),
      updatedAt: resolved ?? reported.toISOString(),
      resolvedAt: resolved,
      resolution: 'resolution' in r ? (r.resolution ?? null) : null,
      source: 'fixture' as const,
      notes: 'note' in r && r.note ? [{ at: reported.toISOString(), by: 'operator_demo', text: r.note }] : [],
    };
  });
}

function fixtureIncidents(): Incident[] {
  return [...room204Incidents(), ...pastReportIncidents()];
}

function room204Incidents(): Incident[] {
  return fixtures.incidents.map((i) => ({
    key: i.id,
    locationId: fixtures.location.id,
    assetId: i.assetId,
    status: i.status as IncidentStatus,
    summary: i.summary,
    reportedAt: i.reportedAt,
    updatedAt: 'resolvedAt' in i && i.resolvedAt ? i.resolvedAt : i.reportedAt,
    resolvedAt: 'resolvedAt' in i ? i.resolvedAt : null,
    resolution: 'resolution' in i ? i.resolution : null,
    source: 'fixture',
    notes: [],
  }));
}

// ---------- backend selection ----------

export function coreBackend(): CoreBackend {
  const has = (n: string) => Boolean(process.env[n]?.trim());
  return has('SURREALDB_URL') && has('SURREALDB_USERNAME') && has('SURREALDB_PASSWORD') ? 'surrealdb' : 'local';
}

let dbPromise: Promise<Surreal> | undefined;
async function db(): Promise<Surreal> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const s = new Surreal();
      const namespace = process.env.SURREALDB_NAMESPACE?.trim() || 'signal';
      const database = process.env.SURREALDB_DATABASE?.trim() || 'demo';
      const username = process.env.SURREALDB_USERNAME!.trim();
      const password = process.env.SURREALDB_PASSWORD!.trim();
      // SURREALDB_AUTH_LEVEL=root signs in as a root user; default is a database-level user (least privilege).
      const authentication =
        process.env.SURREALDB_AUTH_LEVEL?.trim() === 'root' ? { username, password } : { namespace, database, username, password };
      await s.connect(process.env.SURREALDB_URL!.trim(), { namespace, database, authentication });
      // SurrealDB 3 errors on SELECT from an undefined table, so a fresh instance needs these before the first read.
      await s.query(
        ['incident', 'space', 'action_attempt', 'audit_event'].map((t) => `DEFINE TABLE IF NOT EXISTS ${t} SCHEMALESS;`).join('\n'),
      );
      return s;
    })().catch((e) => {
      dbPromise = undefined;
      throw e;
    });
  }
  return dbPromise;
}

/** Runs one SurrealQL statement and returns its rows as plain JSON with the record id stripped. */
async function q<T>(sql: string, vars?: Record<string, unknown>): Promise<T[]> {
  const res = (await (await db()).query(sql, vars).json()) as unknown[];
  const rows = (res[res.length - 1] ?? []) as Record<string, unknown>[];
  return (Array.isArray(rows) ? rows : [rows]).map(({ id: _id, ...rest }) => rest as T);
}

// In-process fallback (survives hot reloads via globalThis).
type LocalStore = { incidents: Map<string, Incident>; actions: Map<string, ActionAttempt>; audit: AuditEvent[]; spaces: Map<string, Space> };
const g = globalThis as unknown as { __signalCore?: LocalStore };
function local(): LocalStore {
  if (!g.__signalCore) {
    g.__signalCore = {
      incidents: new Map(fixtureIncidents().map((i) => [i.key, i])),
      actions: new Map(),
      audit: [],
      spaces: new Map(fixtureSpaces().map((s) => [s.id, s])),
    };
  }
  return g.__signalCore;
}

// ---------- seeding ----------

let seeded = false;
async function ensureSeeded() {
  if (coreBackend() === 'local' || seeded) return;
  const existing = await q<{ n: number }>('SELECT count() AS n FROM incident GROUP ALL');
  if (!existing[0]?.n) {
    for (const i of fixtureIncidents()) await q('CREATE incident CONTENT $doc', { doc: i });
  }
  const spaces = await q<{ n: number }>('SELECT count() AS n FROM space GROUP ALL');
  if (!spaces[0]?.n) {
    for (const s of fixtureSpaces()) await q('CREATE space CONTENT $doc', { doc: spaceDoc(s) });
  }
  seeded = true;
}

/**
 * Operator reset: restores the deterministic incidents (with fresh relative dates) and clears attempts.
 * Space profiles edited in the admin portal are kept unless `spaces: true`. Audit is append-only and kept.
 */
export async function resetDemo(opts: { spaces?: boolean } = {}): Promise<{ backend: CoreBackend; incidents: number; spacesReset: boolean }> {
  const backend = coreBackend();
  const incidents = fixtureIncidents();
  if (backend === 'local') {
    const store = local();
    store.incidents = new Map(incidents.map((i) => [i.key, i]));
    store.actions = new Map();
    if (opts.spaces) store.spaces = new Map(fixtureSpaces().map((s) => [s.id, s]));
  } else {
    await ensureSeeded();
    await q('DELETE incident');
    await q('DELETE action_attempt');
    for (const i of incidents) await q('CREATE incident CONTENT $doc', { doc: i });
    if (opts.spaces) {
      await q('DELETE space');
      for (const s of fixtureSpaces()) await q('CREATE space CONTENT $doc', { doc: spaceDoc(s) });
    }
  }
  await audit({ kind: 'demo.reset', actor: 'operator', subject: 'core', detail: `fixtures restored${opts.spaces ? ' (incl. spaces)' : ''}` });
  return { backend, incidents: incidents.length, spacesReset: Boolean(opts.spaces) };
}

// ---------- spaces (operator-defined context, contacts, NFC links) ----------

// Surreal reserves `id` for the record id, so the space id is stored as `spaceId`.
const spaceDoc = ({ id, ...rest }: Space) => ({ ...rest, spaceId: id });
const fromSpaceDoc = ({ spaceId, ...rest }: Omit<Space, 'id'> & { spaceId: string }): Space => ({ ...rest, id: spaceId });

export async function listSpaces(): Promise<Space[]> {
  if (coreBackend() === 'local') return [...local().spaces.values()];
  await ensureSeeded();
  return (await q<Omit<Space, 'id'> & { spaceId: string }>('SELECT * FROM space')).map(fromSpaceDoc);
}

export async function getSpace(id: string): Promise<Space | undefined> {
  if (coreBackend() === 'local') return local().spaces.get(id);
  await ensureSeeded();
  const row = (await q<Omit<Space, 'id'> & { spaceId: string }>('SELECT * FROM space WHERE spaceId = $id LIMIT 1', { id }))[0];
  return row ? fromSpaceDoc(row) : undefined;
}

export async function saveSpace(space: Space, actor = 'operator'): Promise<Space> {
  const next = { ...space, nfcTags: space.nfcTags.map((t) => t.toUpperCase()), updatedAt: now() };
  if (coreBackend() === 'local') local().spaces.set(next.id, next);
  else {
    await ensureSeeded();
    const existing = await getSpace(next.id);
    if (existing) await q('UPDATE space CONTENT $doc WHERE spaceId = $id', { id: next.id, doc: spaceDoc(next) });
    else await q('CREATE space CONTENT $doc', { doc: spaceDoc(next) });
  }
  await audit({ kind: 'space.saved', actor, subject: next.id, detail: `${next.assets.length} assets, ${next.faqs.length} FAQs, ${next.nfcTags.length} NFC tags` });
  return next;
}

/** NFC chip UID → space id, from operator-linked tags (env NFC_TAGS is checked first by the NFC module). */
export async function spaceIdForTag(uid: string): Promise<string | undefined> {
  const u = uid.toUpperCase();
  return (await listSpaces()).find((s) => s.nfcTags.includes(u))?.id;
}

// ---------- incidents ----------

export async function listIncidents(locationId?: string): Promise<Incident[]> {
  let rows: Incident[];
  if (coreBackend() === 'local') rows = [...local().incidents.values()];
  else {
    await ensureSeeded();
    rows = await q<Incident>('SELECT * FROM incident');
  }
  return rows.filter((i) => !locationId || i.locationId === locationId).sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
}

export async function getIncident(key: string): Promise<Incident | undefined> {
  if (coreBackend() === 'local') return local().incidents.get(key);
  await ensureSeeded();
  return (await q<Incident>('SELECT * FROM incident WHERE key = $key LIMIT 1', { key }))[0];
}

export async function createIncident(input: { locationId: string; assetId: string | null; summary: string }): Promise<Incident> {
  const all = await listIncidents();
  const max = Math.max(102, ...all.map((i) => Number(i.key.replace(/\D/g, '')) || 0));
  const incident: Incident = {
    key: `T-${max + 1}`,
    locationId: input.locationId,
    assetId: input.assetId,
    status: 'OPEN',
    summary: input.summary,
    reportedAt: now(),
    updatedAt: now(),
    source: 'visitor',
    notes: [],
  };
  if (coreBackend() === 'local') local().incidents.set(incident.key, incident);
  else await q('CREATE incident CONTENT $doc', { doc: incident });
  await audit({ kind: 'incident.created', actor: 'visitor', subject: incident.key, detail: input.summary });
  return incident;
}

/** Portal write path — what Anchor's clicks on /demo/maintenance end up calling. */
export async function updateIncidentFromPortal(key: string, patch: { status: IncidentStatus; note: string; by: string }) {
  const current = await getIncident(key);
  if (!current) return undefined;
  const at = now();
  const next: Incident = {
    ...current,
    status: patch.status,
    updatedAt: at,
    resolvedAt: patch.status === 'RESOLVED' ? at : current.resolvedAt ?? null,
    notes: patch.note ? [...current.notes, { at, by: patch.by, text: patch.note }] : current.notes,
  };
  if (coreBackend() === 'local') local().incidents.set(key, next);
  else await q('UPDATE incident MERGE $patch WHERE key = $key', { key, patch: { status: next.status, updatedAt: at, resolvedAt: next.resolvedAt, notes: next.notes } });
  await audit({ kind: 'portal.update', actor: patch.by, subject: key, detail: `${patch.status}: ${patch.note}` });
  return next;
}

// ---------- action attempts ----------

export async function createAttempt(a: Omit<ActionAttempt, 'createdAt' | 'updatedAt'>): Promise<ActionAttempt> {
  const attempt: ActionAttempt = { ...a, createdAt: now(), updatedAt: now() };
  if (coreBackend() === 'local') local().actions.set(attempt.key, attempt);
  else await q('CREATE action_attempt CONTENT $doc', { doc: attempt });
  await audit({ kind: `action.${a.kind.toLowerCase()}.${a.state.toLowerCase()}`, actor: 'system', subject: a.incidentKey, detail: a.key });
  return attempt;
}

export async function getAttempt(key: string): Promise<ActionAttempt | undefined> {
  if (coreBackend() === 'local') return local().actions.get(key);
  return (await q<ActionAttempt>('SELECT * FROM action_attempt WHERE key = $key LIMIT 1', { key }))[0];
}

export async function updateAttempt(key: string, patch: Partial<ActionAttempt>): Promise<ActionAttempt | undefined> {
  const current = await getAttempt(key);
  if (!current) return undefined;
  const next = { ...current, ...patch, updatedAt: now() };
  if (coreBackend() === 'local') local().actions.set(key, next);
  else await q('UPDATE action_attempt MERGE $patch WHERE key = $key', { key, patch: { ...patch, updatedAt: next.updatedAt } });
  if (patch.state && patch.state !== current.state) {
    await audit({ kind: `action.${current.kind.toLowerCase()}.${patch.state.toLowerCase()}`, actor: 'system', subject: current.incidentKey, detail: patch.evidence ?? patch.error ?? key });
  }
  return next;
}

/** Idempotency: an in-flight portal update for the same incident is reused rather than duplicated. */
export async function inFlightAttempt(incidentKey: string, kind: ActionAttempt['kind'] = 'PORTAL_UPDATE'): Promise<ActionAttempt | undefined> {
  const rows = await attemptsForIncident(incidentKey);
  return rows.find((a) => a.kind === kind && (a.state === 'PENDING' || a.state === 'INITIATED'));
}

async function attemptsForIncident(incidentKey: string): Promise<ActionAttempt[]> {
  return coreBackend() === 'local'
    ? [...local().actions.values()].filter((a) => a.incidentKey === incidentKey)
    : await q<ActionAttempt>('SELECT * FROM action_attempt WHERE incidentKey = $incidentKey', { incidentKey });
}

/** Cooldown guard: the newest call attempt for this ticket that actually reached Twilio within `windowMs`. */
export async function recentCallAttempt(incidentKey: string, windowMs: number): Promise<ActionAttempt | undefined> {
  const cutoff = Date.now() - windowMs;
  return (await attemptsForIncident(incidentKey)).find((a) => a.kind === 'MAINTENANCE_CALL' && a.callSid && Date.parse(a.createdAt) > cutoff);
}

export async function listAttemptsByCallSid(callSid: string): Promise<ActionAttempt[]> {
  return coreBackend() === 'local'
    ? [...local().actions.values()].filter((a) => a.callSid === callSid)
    : await q<ActionAttempt>('SELECT * FROM action_attempt WHERE callSid = $callSid', { callSid });
}

// ---------- audit ----------

export async function audit(e: Omit<AuditEvent, 'at'>): Promise<void> {
  const event = { ...e, at: now() };
  try {
    if (coreBackend() === 'local') local().audit.push(event);
    else await q('CREATE audit_event CONTENT $doc', { doc: event });
  } catch (err) {
    console.error('[audit] failed to persist', event, err);
  }
}

export async function recentAudit(limit = 30): Promise<AuditEvent[]> {
  if (coreBackend() === 'local') return local().audit.slice(-limit).reverse();
  return q<AuditEvent>('SELECT * FROM audit_event ORDER BY at DESC LIMIT $limit', { limit });
}

export async function coreHealth(): Promise<{ ok: boolean; backend: CoreBackend; error?: string }> {
  const backend = coreBackend();
  if (backend === 'local') return { ok: true, backend };
  try {
    await q('RETURN true');
    return { ok: true, backend };
  } catch (e) {
    return { ok: false, backend, error: e instanceof Error ? e.message : String(e) };
  }
}
