import type { FaqPreset } from '@/lib/agent/contracts';
import { ago } from '@/lib/agent/space-context';
import { getSpace, listIncidents, type Space } from '@/lib/core';
import { integrationConfig } from '@/lib/env';
import { recallForLocation } from '@/lib/memory';

const MEMORY_TIMEOUT_MS = 5000;

type Topic = { assetId: string; count: number; lastAt: string; lastSummary: string; open: boolean };

function addTopic(map: Map<string, Topic>, assetId: string, at: string, summary: string, open: boolean) {
  const t = map.get(assetId);
  if (!t) map.set(assetId, { assetId, count: 1, lastAt: at, lastSummary: summary, open });
  else {
    t.count += 1;
    t.open ||= open;
    if (at > t.lastAt) Object.assign(t, { lastAt: at, lastSummary: summary });
  }
}

/** Frequent issues according to Agent Memory: parses the Asset / Reported at / Summary lines our facts carry. */
async function memoryTopics(space: Space): Promise<Map<string, Topic> | null> {
  if (!integrationConfig().agentMemory) return null;
  const recall = recallForLocation(space.id, `common problems reported in ${space.name}: ${space.assets.map((a) => a.name).join(', ')}`, 12);
  const timeout = new Promise<null>((r) => setTimeout(() => r(null), MEMORY_TIMEOUT_MS));
  const res = await Promise.race([recall, timeout]).catch(() => null);
  if (!res) return null;
  const topics = new Map<string, Topic>();
  const seen = new Set<string>();
  for (const f of res.facts) {
    const ticket = /Ticket (\S+) status: (\w+)/.exec(f.text);
    const asset = /Asset: ([\w-]+)/.exec(f.text)?.[1];
    const summary = /Summary: (.+)/.exec(f.text)?.[1];
    const at = /Reported at: (\S+)/.exec(f.text)?.[1];
    if (!asset || !summary || !at || !space.assets.some((a) => a.id === asset)) continue;
    if (ticket && seen.has(ticket[1])) continue; // re-seeded duplicates
    if (ticket) seen.add(ticket[1]);
    addTopic(topics, asset, at, summary, ticket?.[2] !== 'RESOLVED');
  }
  return topics.size ? topics : null;
}

/**
 * GET /api/spaces/:id/faq — preset questions for the chat: frequent issues (Agent Memory, falling back to Core
 * reports from the last 30 days) followed by the operator's FAQs.
 */
export async function GET(_request: Request, { id }: { id: string }) {
  const space = await getSpace(id).catch(() => undefined);
  if (!space) return Response.json({ error: 'not_found' }, { status: 404 });

  let source: FaqPreset['source'] = 'memory';
  let topics = await memoryTopics(space);
  if (!topics) {
    source = 'reports';
    topics = new Map();
    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
    for (const i of await listIncidents(space.id).catch(() => [])) {
      if (i.assetId && i.reportedAt >= cutoff) addTopic(topics, i.assetId, i.reportedAt, i.summary, i.status !== 'RESOLVED');
    }
  }

  const frequent: FaqPreset[] = [...topics.values()]
    .sort((a, b) => Number(b.open) - Number(a.open) || b.count - a.count || b.lastAt.localeCompare(a.lastAt))
    .slice(0, 4)
    .map((t) => {
      const asset = space.assets.find((a) => a.id === t.assetId);
      return {
        label: `${asset?.name ?? t.assetId}: ${t.lastSummary.toLowerCase()}`,
        message: t.lastSummary,
        source,
        detail: `${t.count > 1 ? `reported ${t.count}× · ` : ''}last ${ago(t.lastAt).text}${t.open ? ' · still open' : ''}`,
      };
    });
  const faqs: FaqPreset[] = space.faqs.map((f) => ({ label: f.q, message: f.q, source: 'faq' }));

  return Response.json({ spaceId: space.id, presets: [...frequent, ...faqs].slice(0, 8), frequentSource: frequent.length ? source : null });
}
