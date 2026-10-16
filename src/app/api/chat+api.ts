import { anthropic } from '@ai-sdk/anthropic';
import { generateText } from 'ai';
import { z } from 'zod';

import type { ChatEvent } from '@/lib/agent/contracts';
import { integrationConfig } from '@/lib/env';
import { recallForLocation, type RecalledFact } from '@/lib/memory';

const Body = z.object({
  message: z.string().min(1).max(1000),
  locationId: z.string().min(1).max(64),
});

// Deterministic safety gate: runs BEFORE any model call. Hazard reports never get DIY steps or auto-911.
const HAZARD = /\b(smoke|smoking|fire|flames?|sparks?|sparking|burning|burnt|shock|electrocut\w*|gas leak|exposed wire)\b/i;

const SYSTEM = `You are Pip, SIGNAL's on-site helper. Be a trustworthy technician first, a friendly companion second.
Reply in 1-3 short sentences, one question at a time. Only state facts present in the provided memory facts, and mention their source.
Never claim something is fixed or that staff were notified. Never give hazardous repair instructions.`;

function memoryBlock(facts: RecalledFact[]) {
  return facts.length ? facts.map((f, i) => `[${i + 1}] ${f.text}`).join('\n\n') : '(no relevant memory found)';
}

/** POST /api/chat — first vertical slice: safety gate -> scoped memory recall -> (optional) grounded LLM reply. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const { message, locationId } = parsed.data;
  const events: ChatEvent[] = [];

  if (HAZARD.test(message)) {
    events.push(
      { type: 'avatar', state: 'escalating' },
      { type: 'text', text: 'Please stop using that equipment and alert staff now. I can’t help with this one safely.' },
      { type: 'completed', outcome: 'safety_handoff' },
    );
    return Response.json({ events });
  }

  const configured = integrationConfig();
  events.push({ type: 'avatar', state: 'thinking' }, { type: 'step', label: 'Checking what happened here before…', status: 'started' });

  let facts: RecalledFact[] = [];
  let traceId: string | undefined;
  if (configured.agentMemory) {
    try {
      const recalled = await recallForLocation(locationId, message);
      facts = recalled.facts;
      traceId = recalled.traceId;
      events.push({ type: 'step', label: 'Memory recall', status: 'done' });
    } catch (e) {
      events.push(
        { type: 'step', label: 'Memory recall', status: 'failed' },
        { type: 'notice', code: 'memory_unavailable', message: e instanceof Error ? e.message : String(e) },
      );
    }
  } else {
    events.push(
      { type: 'step', label: 'Memory recall', status: 'failed' },
      { type: 'notice', code: 'memory_unavailable', message: 'Agent Memory is not configured.' },
    );
  }

  for (const f of facts) {
    events.push({ type: 'source', title: f.source ?? 'Agent Memory', text: f.text, occurredAt: f.occurredAt });
  }

  if (!configured.llm) {
    events.push(
      { type: 'avatar', state: 'idle' },
      { type: 'notice', code: 'llm_not_configured', message: 'No model key is set (ANTHROPIC_API_KEY), so only recalled memory is shown.' },
      { type: 'completed', outcome: 'memory_only', traceId },
    );
    return Response.json({ events });
  }

  try {
    const { text } = await generateText({
      model: anthropic(process.env.AI_MODEL || 'claude-sonnet-5-5'),
      system: SYSTEM,
      prompt: `Location: ${locationId}\n\nMemory facts:\n${memoryBlock(facts)}\n\nVisitor: ${message}`,
    });
    events.push({ type: 'avatar', state: 'helping' }, { type: 'text', text }, { type: 'completed', outcome: 'guided', traceId });
  } catch (e) {
    events.push(
      { type: 'avatar', state: 'idle' },
      { type: 'notice', code: 'llm_not_configured', message: `Model call failed: ${e instanceof Error ? e.message : String(e)}` },
      { type: 'completed', outcome: 'model_error', traceId },
    );
  }
  return Response.json({ events });
}
