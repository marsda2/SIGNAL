import { generateObject } from 'ai';
import { z } from 'zod';

import fixtures from '@/data/demo-fixtures.json';
import { authorizeProposedAction, DecisionSchema, type AgentDecision, type ChatEvent } from '@/lib/agent/contracts';
import { chatModel, chatProviderOptions, modelId } from '@/lib/agent/model';
import { issueActionId } from '@/lib/approvals';
import { audit, coreBackend, listIncidents, toView, type Incident } from '@/lib/core';
import { flags, integrationConfig } from '@/lib/env';
import { recallForLocation, type RecalledFact } from '@/lib/memory';
import { flushTraces, traceIdOf, withSpan } from '@/lib/tracing';

const Body = z.object({
  message: z.string().min(1).max(1000),
  locationId: z.string().min(1).max(64),
  history: z
    .array(z.object({ role: z.enum(['visitor', 'pip']), text: z.string().max(1500) }))
    .max(12)
    .optional(),
});

// Deterministic safety gate: runs BEFORE any model call. Hazard reports never get DIY steps or auto-911.
const HAZARD = /\b(smoke|smoking|fire|flames?|sparks?|sparking|burning|burnt|shock|electrocut\w*|gas leak|exposed wire)\b/i;

const SYSTEM = `You are Pip, SIGNAL's on-site helper for one physical room. Be a trustworthy technician first, a friendly companion second.
Return a decision object. Rules:
- userVisibleExplanation: 1-3 short sentences, at most ONE question. Mention where a fact came from (e.g. "a technician fixed this on Oct 14 by…").
- Only use facts from MEMORY, INCIDENTS and ASSETS below. Never invent history, never claim staff were notified or something is fixed.
- Prefer GUIDE with one safe step from ASSETS/MEMORY first. If the visitor says the safe steps did not help and an OPEN incident matches, use LINK_EXISTING with its key in relatedIncidentId.
- If nothing matches and self-service failed, propose CREATE_INCIDENT (the visitor will be asked to approve; say so).
- Never give steps that open, unplug internals of, or modify equipment. Hazards -> SAFETY_HANDOFF.
- evidenceFactIds: ids like "M1" or incident keys like "T-102" that support your answer.`;

function memoryBlock(facts: RecalledFact[]) {
  return facts.length ? facts.map((f, i) => `[M${i + 1}] ${f.text}`).join('\n\n') : '(no relevant memory found)';
}

function incidentBlock(incidents: Incident[]) {
  return incidents.length
    ? incidents.map((i) => `${i.key} [${i.status}] asset=${i.assetId ?? 'unknown'} reported=${i.reportedAt} — ${i.summary}${i.resolution ? ` (resolution: ${i.resolution})` : ''}`).join('\n')
    : '(no incidents on record)';
}

function assetBlock() {
  return fixtures.assets.map((a) => `${a.id} (${a.type}, ${a.model}) safe steps: ${a.safeTroubleshooting.join('; ')}`).join('\n');
}

/** POST /api/chat — safety gate -> scoped memory recall + Core incidents -> Gemini decision -> policy gate -> typed events. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const { message, locationId, history = [] } = parsed.data;

  const events = await withSpan('chat.turn', 'CHAIN', { 'input.value': message, 'signal.location': locationId }, async (root) => {
    const events: ChatEvent[] = [];
    const traceId = traceIdOf(root);

    if (HAZARD.test(message)) {
      await withSpan('safety.gate', 'GUARDRAIL', { 'signal.hazard': true }, async () => undefined);
      await audit({ kind: 'safety.handoff', actor: 'visitor', subject: locationId, detail: message.slice(0, 200) });
      events.push(
        { type: 'avatar', state: 'escalating' },
        { type: 'cue', cue: 'safety', caption: 'Safety alert: stop and get staff.' },
        { type: 'text', text: 'Please stop using that equipment, move away from it and alert staff now. I can’t help with this one safely, and I have not contacted anyone.' },
        { type: 'completed', outcome: 'safety_handoff', traceId },
      );
      return events;
    }

    const configured = integrationConfig();
    events.push({ type: 'avatar', state: 'thinking' }, { type: 'step', label: 'Checking what happened here before…', status: 'started' });

    let facts: RecalledFact[] = [];
    if (configured.agentMemory) {
      try {
        const recalled = await withSpan('memory.recall', 'RETRIEVER', { 'input.value': message }, async (span) => {
          const r = await recallForLocation(locationId, message);
          span.setAttribute('retrieval.documents.count', r.facts.length);
          span.setAttribute('signal.memory.query_ms', r.queryMs);
          r.facts.forEach((f, i) => span.setAttribute(`retrieval.documents.${i}.document.content`, f.text.slice(0, 500)));
          return r;
        });
        facts = recalled.facts;
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
    for (const f of facts) events.push({ type: 'source', title: f.source ?? 'Agent Memory', text: f.text, occurredAt: f.occurredAt });

    let incidents: Incident[] = [];
    try {
      incidents = await listIncidents(locationId);
    } catch (e) {
      events.push({ type: 'notice', code: 'core_unavailable', message: `Incident database unreachable: ${e instanceof Error ? e.message : String(e)}` });
    }

    if (!configured.llm) {
      events.push(
        { type: 'avatar', state: 'idle' },
        { type: 'notice', code: 'llm_not_configured', message: 'No model key is set (GEMINI_API_KEY), so only recalled memory is shown.' },
        { type: 'completed', outcome: 'memory_only', traceId },
      );
      return events;
    }

    let decision: AgentDecision;
    try {
      const transcript = history.map((h) => `${h.role === 'visitor' ? 'Visitor' : 'Pip'}: ${h.text}`).join('\n');
      const prompt = `LOCATION: ${locationId} (${fixtures.location.name})\n\nASSETS:\n${assetBlock()}\n\nMEMORY:\n${memoryBlock(facts)}\n\nINCIDENTS:\n${incidentBlock(incidents)}\n\nCONVERSATION SO FAR:\n${transcript || '(start)'}\n\nVisitor: ${message}`;
      decision = await withSpan('llm.decide', 'LLM', { 'llm.model_name': modelId(), 'llm.provider': 'google', 'input.value': prompt }, async (span) => {
        const { object, usage } = await generateObject({
          model: chatModel(),
          schema: DecisionSchema,
          system: SYSTEM,
          prompt,
          providerOptions: chatProviderOptions(),
        });
        span.setAttribute('output.value', JSON.stringify(object));
        if (usage?.inputTokens) span.setAttribute('llm.token_count.prompt', usage.inputTokens);
        if (usage?.outputTokens) span.setAttribute('llm.token_count.completion', usage.outputTokens);
        return object;
      });
    } catch (e) {
      events.push(
        { type: 'avatar', state: 'idle' },
        { type: 'notice', code: 'llm_not_configured', message: `Model call failed: ${e instanceof Error ? e.message : String(e)}` },
        { type: 'completed', outcome: 'model_error', traceId },
      );
      return events;
    }

    // Server-side policy: the model proposes, this code decides.
    const decisionForGate = { ...decision, locationId: decision.locationId || locationId };
    const actionId = issueActionId(decision.proposedAction, locationId, decision.relatedIncidentId ?? 'new');
    const gate = await withSpan('policy.gate', 'GUARDRAIL', { 'signal.proposed_action': decision.proposedAction }, async (span) => {
      const g = authorizeProposedAction(decisionForGate, {
        signedSessionLocationId: locationId,
        actionId,
        isEmergencyOrHazard: decision.classification === 'SAFETY_HANDOFF',
        hasAllowlistedContact: Boolean(process.env.DEMO_APPROVED_PHONE_E164?.trim()),
        hasValidMaintenancePortal: configured.anchor && configured.portalPublicUrl,
        operatorEnabledCalls: flags.outboundCalls,
        cooldownActive: false,
      });
      span.setAttribute('signal.gate.allowed', g.allowed);
      span.setAttribute('signal.gate.reason', g.reason);
      return g;
    });

    let reply = decision.userVisibleExplanation;
    if (decision.suggestedFix && decision.proposedAction === 'GUIDE' && !reply.includes(decision.suggestedFix)) reply += `\n\nTry: ${decision.suggestedFix}`;
    events.push({ type: 'text', text: reply });

    const action = decision.proposedAction;
    const linked = decision.relatedIncidentId ? incidents.find((i) => i.key === decision.relatedIncidentId) : undefined;

    if (gate.reason === 'location_mismatch') {
      events.push({ type: 'notice', code: 'policy_blocked', message: 'Blocked: the model referenced a different location.' });
    } else if (action === 'SAFETY_HANDOFF') {
      events.push({ type: 'avatar', state: 'escalating' }, { type: 'cue', cue: 'safety', caption: 'Safety alert: stop and get staff.' });
    } else if (action === 'LINK_EXISTING' && linked) {
      events.push({ type: 'incident', incident: toView(linked), relation: 'linked' });
      if (linked.status !== 'RESOLVED' && configured.anchor) {
        events.push({
          type: 'approval',
          actionId: issueActionId('UPDATE_PORTAL', locationId, linked.key),
          kind: 'UPDATE_PORTAL',
          label: `Add my report to ${linked.key} in the maintenance portal`,
          incidentKey: linked.key,
          summary: message,
        });
      }
      events.push({ type: 'avatar', state: 'helping' });
    } else if (action === 'CREATE_INCIDENT' || action === 'UPDATE_PORTAL' || action === 'REQUEST_MAINTENANCE_CALL') {
      if (action === 'REQUEST_MAINTENANCE_CALL') {
        events.push({ type: 'notice', code: 'policy_blocked', message: 'Phone escalation is off for this demo; I can file a ticket instead.' });
      }
      if (linked && action === 'UPDATE_PORTAL' && configured.anchor) {
        events.push(
          { type: 'incident', incident: toView(linked), relation: 'linked' },
          { type: 'approval', actionId: issueActionId('UPDATE_PORTAL', locationId, linked.key), kind: 'UPDATE_PORTAL', label: `Update ${linked.key} in the maintenance portal`, incidentKey: linked.key, summary: message },
        );
      } else {
        const summary = message.slice(0, 300);
        events.push({
          type: 'approval',
          actionId: issueActionId('CREATE_INCIDENT', locationId, 'new'),
          kind: 'CREATE_INCIDENT',
          label: 'Report this to maintenance',
          summary,
          assetId: decision.assetId,
        });
      }
      events.push({ type: 'avatar', state: 'escalating' }, { type: 'cue', cue: 'escalating', caption: 'Ready to report this — waiting for your OK.' });
    } else {
      events.push({ type: 'avatar', state: 'helping' });
    }

    if (coreBackend() === 'local' && events.some((e) => e.type === 'incident' || e.type === 'approval')) {
      events.push({ type: 'notice', code: 'core_local', message: 'Incidents are in the local demo store (SurrealDB Core not configured).' });
    }
    root.setAttribute('output.value', reply);
    events.push({ type: 'completed', outcome: action.toLowerCase(), traceId });
    return events;
  });

  await flushTraces();
  return Response.json({ events });
}
