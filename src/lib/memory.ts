import { AgentMemory } from '@surrealdb/memory';

import fixtures from '@/data/demo-fixtures.json';
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

/** Writes the synthetic Room 204 incidents into Agent Memory, labelled so recall can stay location-scoped. */
export async function seedDemoMemory() {
  const mem = memory();
  const results = [];
  for (const incident of fixtures.incidents) {
    const res = await mem.remember(incidentFactText(incident), {
      infer: 'none',
      labels: [locationLabel(fixtures.location.id), 'demo=true', `ticket=${incident.id}`],
    });
    results.push({ ticket: incident.id, ok: Boolean(res) });
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
