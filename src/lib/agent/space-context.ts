// Server-only. Deterministic space context: "seen before" matching, FAQ matching, escalation options.
// Hybrid memory recall returns merely *related* hits, so "this was reported N days ago" needs its own check (AGENTS.md).
import type { Incident, Space } from '@/lib/core';

import type { EscalationOption } from './contracts';

const STOP = new Set(
  'a an the is are was were be been it its this that i my me we our you your to of in on at for with and or but not no do does did dont doesnt cant cannot wont isnt arent has have had can could should would will just still again any some there here what why how when where who please help hi hello hey thanks thank working work works'.split(' '),
);

/** Words that point at an asset type. Matching is on the space's asset `type`. */
const TYPE_WORDS: Record<string, string[]> = {
  projector: ['projector', 'screen', 'display', 'beamer', 'hdmi', 'signal', 'image', 'picture', 'black', 'flicker', 'flickering', 'flickers', 'blank', 'mirror', 'duplicate', 'slides'],
  wifi: ['wifi', 'wi-fi', 'internet', 'network', 'password', 'ssid', 'slow', 'connect', 'connection', 'online', 'offline', 'wireless'],
  laptop: ['laptop', 'computer', 'pc', 'clicker', 'presenter', 'login', 'remote', 'keyboard', 'mouse'],
  lock: ['lock', 'door', 'keypad', 'code', 'locked', 'key', 'entry', 'open'],
};

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/wi-fi/g, 'wifi')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => (w.length > 4 && w.endsWith('s') ? w.slice(0, -1) : w))
    .filter((w) => w.length > 1 && !STOP.has(w));
}

function mentionedTypes(words: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const [type, list] of Object.entries(TYPE_WORDS)) if (list.some((w) => words.has(w))) out.add(type);
  return out;
}

export function ago(iso: string, nowMs = Date.now()): { days: number; text: string } {
  const days = Math.max(0, Math.floor((nowMs - Date.parse(iso)) / 86_400_000));
  return { days, text: days === 0 ? 'earlier today' : days === 1 ? 'yesterday' : `${days} days ago` };
}

export type SimilarReport = { incident: Incident; score: number; strong: boolean; days: number; agoText: string; assetName: string };

/** Ranks this space's incidents against the visitor's message. Requires an asset-type match; extra overlap makes it "strong". */
export function findSimilar(message: string, space: Space, incidents: Incident[]): SimilarReport[] {
  const words = new Set(tokens(message));
  const types = mentionedTypes(words);
  if (!types.size) return [];
  const out: SimilarReport[] = [];
  for (const inc of incidents) {
    const asset = space.assets.find((a) => a.id === inc.assetId);
    if (!asset || !types.has(asset.type)) continue;
    let score = 3;
    // Distinguishing words from the asset name ("left", "right").
    for (const w of tokens(asset.name)) if (words.has(w) && !TYPE_WORDS[asset.type]?.includes(w)) score += 2;
    for (const w of new Set(tokens(inc.summary))) if (words.has(w)) score += 1;
    const a = ago(inc.reportedAt);
    out.push({ incident: inc, score, strong: score >= 5, days: a.days, agoText: a.text, assetName: asset.name });
  }
  // Open first, then score, then most recent.
  return out.sort((x, y) => Number(y.incident.status !== 'RESOLVED') - Number(x.incident.status !== 'RESOLVED') || y.score - x.score || x.days - y.days);
}

export function matchFaq(message: string, space: Space) {
  const words = new Set(tokens(message));
  let best: { faq: Space['faqs'][number]; ratio: number } | undefined;
  for (const faq of space.faqs) {
    const q = [...new Set(tokens(faq.q))];
    if (!q.length) continue;
    const hit = q.filter((w) => words.has(w)).length;
    const ratio = hit / q.length;
    if (hit >= 2 && ratio >= 0.5 && (!best || ratio > best.ratio)) best = { faq, ratio };
  }
  return best?.faq;
}

/** Human-initiated contact options. The bot never dials or emails by itself. */
export function escalationOptions(space: Space, ctx: { summary: string; incidentKey?: string; urgent?: boolean }): EscalationOption[] {
  const e = space.escalation;
  const options: EscalationOption[] = [];
  if (e.urgentPhone) {
    options.push({ kind: 'call', label: ctx.urgent ? 'Call the urgent line now' : 'Call the urgent line', href: `tel:${e.urgentPhone.replace(/[^\d+]/g, '')}`, detail: [e.urgentLabel, e.urgentPhone].filter(Boolean).join(' · ') });
  }
  if (e.email) {
    const subject = `[SIGNAL] ${space.name}${ctx.incidentKey ? ` · ${ctx.incidentKey}` : ''}: ${ctx.summary.slice(0, 80)}`;
    const body = `Location: ${space.name} (${space.siteName})\n${ctx.incidentKey ? `Related ticket: ${ctx.incidentKey}\n` : ''}Report: ${ctx.summary}\n\nSent from the SIGNAL helper.`;
    options.push({ kind: 'email', label: 'Email facilities', href: `mailto:${e.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, detail: e.email });
  }
  if (e.portal === 'external' && e.portalUrl && /^https:\/\//.test(e.portalUrl)) {
    options.push({ kind: 'link', label: 'Open the maintenance portal', href: e.portalUrl, detail: 'External portal' });
  }
  return options;
}

export function spacePromptBlocks(space: Space, similar: SimilarReport[]) {
  const assets = space.assets.map((a) => `${a.id} (${a.type}, ${a.name}${a.model ? `, ${a.model}` : ''}) safe steps: ${a.safeTroubleshooting.join('; ')}`).join('\n');
  const faqs = space.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join('\n') || '(none)';
  const sim = similar.length
    ? similar
        .slice(0, 4)
        .map((s) => `${s.incident.key} [${s.incident.status}] ${s.assetName}, reported ${s.agoText} — ${s.incident.summary}${s.incident.resolution ? ` (fixed by: ${s.incident.resolution})` : ''}${s.strong ? ' [STRONG MATCH]' : ''}`)
        .join('\n')
    : '(no similar past reports)';
  return { assets, faqs, sim };
}
