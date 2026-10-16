import { AgentMemory } from '@surrealdb/memory';

import fixtures from '@/data/demo-fixtures.json';
import { listIncidents, listSpaces, type Incident, type Space } from './core';
import { requireEnv } from './env';

let client: AgentMemory | undefined;

/** Official SurrealDB Agent Memory client (@surrealdb/memory). Context-pinned, server-side only. */
export function memory(): AgentMemory {
  if (!client) {
    const env = requireEnv('AGENT_MEMORY_ENDPOINT', 'AGENT_MEMORY_CONTEXT_ID', 'AGENT_MEMORY_API_KEY');
    client = new AgentMemory({
      endpoint: env.AGENT_MEMORY_ENDPOINT.replace(/\/+$/, ''),
      context: env.AGENT_MEMORY_CONTEXT_ID,
      apiKey: env.AGENT_MEMORY_API_KEY,
    });
  }
  return client;
}

export const locationLabel = (locationId: string) => `location=${locationId}`;

/** Facts are written as literal text (infer: 'none') with a SOURCE line so recall results carry provenance. */
export function incidentFactText(i: (typeof fixtures.incidents)[number]): string {
  const lines = [
    `SOURCE: demo-fixtures (synthetic, ticket ${i.id})`,
    `Location: ${fixtures.location.name}`,
    `Asset: ${i.assetId}`,
    `Ticket ${i.id} status: ${i.status}`,
    `Reported at: ${i.reportedAt}`,
    `Summary: ${i.summary}`,
  ];
  if ('resolution' in i) {
    lines.push(`Resolution: ${i.resolution}`, `Resolved at: ${i.resolvedAt}`, `Verified by: ${i.resolutionVerifiedBy}`);
  }
  return lines.join('\n');
}

/** Same shape as incidentFactText, for any Core incident (Pitch Area reports etc.). */
export function coreIncidentFactText(i: Incident, spaceName: string, assetName?: string): string {
  const lines = [
    `SOURCE: ${i.source === 'fixture' ? `demo-fixtures (synthetic, ticket ${i.key})` : `SIGNAL incident database, ticket ${i.key}`}`,
    `Location: ${spaceName}`,
    `Asset: ${i.assetId ?? 'unknown'}${assetName ? ` (${assetName})` : ''}`,
    `Ticket ${i.key} status: ${i.status}`,
    `Reported at: ${i.reportedAt}`,
    `Summary: ${i.summary}`,
  ];
  if (i.resolution) lines.push(`Resolution: ${i.resolution}`, `Resolved at: ${i.resolvedAt ?? 'unknown'}`);
  const note = i.notes.at(-1);
  if (note) lines.push(`Latest note (${note.at}): ${note.text}`);
  return lines.join('\n');
}

export function spaceProfileText(s: Space): string {
  return [
    `SOURCE: operator space profile (updated ${s.updatedAt ?? new Date().toISOString()}; supersedes earlier profiles of this space)`,
    `Location: ${s.name} at ${s.siteName}`,
    `Description: ${s.description}`,
    `Equipment: ${s.assets.map((a) => `${a.name} (${a.type})`).join(', ')}`,
    ...s.faqs.map((f) => `FAQ: ${f.q} → ${f.a}`),
  ].join('\n');
}

export async function rememberSpaceProfile(s: Space) {
  return memory().remember(spaceProfileText(s), { infer: 'none', labels: [locationLabel(s.id), 'kind=space_profile'] });
}

/** Writes every space profile + every Core incident into Agent Memory, labelled per location. Operator-only. */
export async function seedDemoMemory() {
  const mem = memory();
  const results: { ref: string; ok: boolean }[] = [];
  const spaces = await listSpaces();
  for (const s of spaces) {
    results.push({ ref: `profile:${s.id}`, ok: Boolean(await rememberSpaceProfile(s)) });
    for (const incident of await listIncidents(s.id)) {
      const res = await mem.remember(coreIncidentFactText(incident, s.name, s.assets.find((a) => a.id === incident.assetId)?.name), {
        infer: 'none',
        labels: [locationLabel(s.id), 'demo=true', `ticket=${incident.key}`],
      });
      results.push({ ref: incident.key, ok: Boolean(res) });
    }
  }
  return results;
}

export type RecalledFact = { text: string; source?: string; occurredAt?: string };

/** Location-scoped recall. Never returns facts labelled for a different location. */
export async function recallForLocation(locationId: string, query: string, k = 5) {
  const started = Date.now();
  const res = await memory().recall(query, {
    k,
    mode: 'hybrid',
    source: 'signal-chat',
    labels: [locationLabel(locationId)],
  });
  const hits = ((res as { hits?: unknown[] }).hits ?? []) as Record<string, unknown>[];
  const facts: RecalledFact[] = hits.map((h) => ({
    text: String(h.text ?? h.content ?? h.summary ?? h.value ?? h.passage ?? JSON.stringify(h)),
    source: typeof h.source === 'string' ? h.source : undefined,
    occurredAt: typeof h.occurredAt === 'string' ? h.occurredAt : undefined,
  }));
  return { facts, queryMs: Date.now() - started, traceId: (res as { trace?: { traceId?: string } }).trace?.traceId };
}
