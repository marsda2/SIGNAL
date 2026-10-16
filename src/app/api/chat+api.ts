import { generateObject } from 'ai';
import { z } from 'zod';

import { authorizeProposedAction, DecisionSchema, type AgentDecision, type ChatEvent } from '@/lib/agent/contracts';
import { chatModel, chatProviderOptions, modelId } from '@/lib/agent/model';
import { escalationOptions, findSimilar, matchFaq, spacePromptBlocks, type SimilarReport } from '@/lib/agent/space-context';
import { issueActionId } from '@/lib/approvals';
import { denied, sessionFrom, visitorAccess } from '@/lib/access';
import { audit, coreBackend, listIncidents, toView, type Incident, type Space } from '@/lib/core';
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

const SYSTEM = `You are Pip, SIGNAL's on-site helper for one physical space. Be a trustworthy technician first, a friendly companion second.
Return a decision object. Rules:
- userVisibleExplanation: 1-3 short sentences, at most ONE question. Mention where a fact came from and how long ago (e.g. "this was reported 2 days ago", "a technician fixed this 9 days ago by…").
- Only use facts from SPACE, FAQ, SIMILAR PAST REPORTS, MEMORY and INCIDENTS below. Never invent history, never claim staff were notified or something is fixed.
- If SIMILAR PAST REPORTS has an OPEN report marked STRONG MATCH, say it was already reported (with how long ago) and use LINK_EXISTING with its key in relatedIncidentId — the visitor should not keep troubleshooting.
- If a RESOLVED similar report has a fix, offer that fix first (GUIDE).
- If an FAQ answers the question, use ANSWER with the FAQ's answer.
- Otherwise prefer GUIDE with one safe step from ASSETS. If self-service failed and nothing open matches, propose CREATE_INCIDENT (the visitor will be asked to approve; say so).
- Never reveal door codes or passwords that are not literally in FAQ/ASSETS. Never give steps that open, climb to, or modify equipment. Hazards -> SAFETY_HANDOFF.
- evidenceFactIds: ids like "M1" or incident keys like "P-202" that support your answer.`;

function memoryBlock(facts: RecalledFact[]) {
  return facts.length ? facts.map((f, i) => `[M${i + 1}] ${f.text}`).join('\n\n') : '(no relevant memory found)';
}

function incidentBlock(incidents: Incident[]) {
  return incidents.length
    ? incidents
        .slice(0, 15)
        .map((i) => `${i.key} [${i.status}] asset=${i.assetId ?? 'unknown'} reported=${i.reportedAt} — ${i.summary}${i.resolution ? ` (resolution: ${i.resolution})` : ''}`)
        .join('\n')
    : '(no incidents on record)';
}

/** POST /api/chat — safety gate → space + memory + Core → deterministic "seen before" → Gemini decision → policy gate → typed events. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const { message, history = [] } = parsed.data;
  // A signed NFC session (header x-signal-session) decides the location; NFC-only spaces refuse requests without one.
  const session = sessionFrom(request);
  const locationId = session?.loc ?? parsed.data.locationId;
  const access = await visitorAccess(request, locationId);
  if (!access.ok) return denied(access);
  const sp: Space = access.space;

  const events = await withSpan('chat.turn', 'CHAIN', { 'input.value': message, 'signal.location': locationId, 'signal.access': access.via }, async (root) => {
    const events: ChatEvent[] = [];
    const traceId = traceIdOf(root);
    const configured = integrationConfig();

    const pushEscalation = (reason: string, urgent: boolean, incidentKey?: string) => {
      if (events.some((e) => e.type === 'escalation')) return;
      const options = escalationOptions(sp, { summary: message, incidentKey, urgent });
      if (options.length) events.push({ type: 'escalation', reason, urgent, options });
    };
    const pushPortalApproval = (incident: Incident, label?: string) => {
      if (events.some((e) => e.type === 'approval')) return;
      if (sp.escalation.portal !== 'signal_demo' || !configured.anchor || incident.status === 'RESOLVED') return;
      events.push({
        type: 'approval',
        actionId: issueActionId('UPDATE_PORTAL', locationId, incident.key),
        kind: 'UPDATE_PORTAL',
        label: label ?? `Add my report to ${incident.key} and escalate`,
        incidentKey: incident.key,
        summary: message,
      });
    };
    const pushCreateApproval = (assetId: string | null) => {
      if (events.some((e) => e.type === 'approval')) return;
      events.push({ type: 'approval', actionId: issueActionId('CREATE_INCIDENT', locationId, 'new'), kind: 'CREATE_INCIDENT', label: 'Report this to maintenance', summary: message.slice(0, 300), assetId });
    };

    if (HAZARD.test(message)) {
      await withSpan('safety.gate', 'GUARDRAIL', { 'signal.hazard': true }, async () => undefined);
      await audit({ kind: 'safety.handoff', actor: 'visitor', subject: locationId, detail: message.slice(0, 200) });
      events.push(
        { type: 'avatar', state: 'escalating' },
        { type: 'cue', cue: 'safety', caption: 'Safety alert: stop and get staff.' },
        { type: 'text', text: 'Please stop using that equipment, move away from it and alert staff now. I can’t help with this one safely, and I have not contacted anyone. For a real emergency, call your local emergency number.' },
      );
      pushEscalation('Safety issue — contact staff directly', true);
      events.push({ type: 'completed', outcome: 'safety_handoff', traceId });
      return events;
    }

    events.push({ type: 'avatar', state: 'thinking' }, { type: 'step', label: `Checking what happened in ${sp.name} before…`, status: 'started' });

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
        events.push({ type: 'step', label: 'Memory recall', status: 'failed' }, { type: 'notice', code: 'memory_unavailable', message: e instanceof Error ? e.message : String(e) });
      }
    } else {
      events.push({ type: 'step', label: 'Memory recall', status: 'failed' }, { type: 'notice', code: 'memory_unavailable', message: 'Agent Memory is not configured.' });
    }
    for (const f of facts.slice(0, 3)) events.push({ type: 'source', title: f.source ?? 'Agent Memory', text: f.text, occurredAt: f.occurredAt });

    let incidents: Incident[] = [];
    try {
      incidents = await listIncidents(locationId);
    } catch (e) {
      events.push({ type: 'notice', code: 'core_unavailable', message: `Incident database unreachable: ${e instanceof Error ? e.message : String(e)}` });
    }

    // Deterministic "seen before" — runs with or without the model.
    const similar = await withSpan('reports.similar', 'RETRIEVER', { 'input.value': message }, async (span) => {
      const s = findSimilar(message, sp, incidents);
      span.setAttribute('retrieval.documents.count', s.length);
      s.slice(0, 4).forEach((m, i) => span.setAttribute(`retrieval.documents.${i}.document.content`, `${m.incident.key} score=${m.score} ${m.incident.summary}`));
      return s;
    });
    const faq = matchFaq(message, sp);
    const openStrong = similar.find((s) => s.strong && s.incident.status !== 'RESOLVED');
    // A clear FAQ hit beats a loosely related old report; a strong resolved match still wins.
    const resolvedFix = similar.find((s) => s.incident.status === 'RESOLVED' && s.incident.resolution && (s.strong || (!faq && s.score >= 4)));
    for (const s of [openStrong, resolvedFix].filter((x): x is SimilarReport => Boolean(x))) {
      events.push({ type: 'seen_before', incident: toView(s.incident), agoText: s.agoText, days: s.days, strong: s.strong, assetName: s.assetName });
    }
    const urgentAsset = (s?: SimilarReport) => sp.assets.find((a) => a.id === s?.incident.assetId)?.type === 'lock';

    // Answer from records only — used when the model is missing or fails. Clearly labelled.
    const recordsReply = (why: string) => {
      events.push({ type: 'notice', code: 'llm_not_configured', message: `${why} This answer is built only from this space’s records.` });
      let outcome = 'records_only';
      if (openStrong) {
        const note = openStrong.incident.notes.at(-1)?.text;
        events.push({ type: 'text', text: `This was already reported ${openStrong.agoText} (${openStrong.incident.key}: “${openStrong.incident.summary}”) and it’s still open${note ? ` — latest note: ${note}` : ''}. No need to keep troubleshooting: I can add your report to that ticket, or you can contact facilities below.` });
        pushPortalApproval(openStrong.incident);
        pushEscalation(`Already reported ${openStrong.agoText}`, urgentAsset(openStrong), openStrong.incident.key);
        events.push({ type: 'avatar', state: 'escalating' }, { type: 'cue', cue: 'escalating', caption: 'Known issue — ready to escalate with your OK.' });
        outcome = 'link_existing';
      } else if (faq && !resolvedFix?.strong) {
        events.push({ type: 'text', text: faq.a }, { type: 'source', title: `${sp.name} FAQ (set by the operator)`, text: faq.q }, { type: 'avatar', state: 'helping' });
        outcome = 'answer';
      } else if (resolvedFix) {
        events.push({ type: 'text', text: `Seen before: ${resolvedFix.agoText} someone reported “${resolvedFix.incident.summary}”. It was fixed by: ${resolvedFix.incident.resolution}. Want to try that first?` });
        events.push({ type: 'avatar', state: 'helping' });
        outcome = 'guide';
      } else {
        events.push({ type: 'text', text: `I don’t see a matching past report for ${sp.name}. I can file a ticket so staff can look at it.` });
        pushCreateApproval(null);
        pushEscalation('Need a person?', false);
        events.push({ type: 'avatar', state: 'escalating' });
        outcome = 'create_incident';
      }
      events.push({ type: 'completed', outcome, traceId });
    };

    if (!configured.llm) {
      recordsReply('No model key is set (GEMINI_API_KEY).');
      return events;
    }

    let decision: AgentDecision;
    try {
      const blocks = spacePromptBlocks(sp, similar);
      const transcript = history.map((h) => `${h.role === 'visitor' ? 'Visitor' : 'Pip'}: ${h.text}`).join('\n');
      const prompt = [
        `LOCATION: ${locationId}`,
        `SPACE: ${sp.name} at ${sp.siteName}. ${sp.description}`,
        `ASSETS:\n${blocks.assets}`,
        `FAQ (operator-defined):\n${blocks.faqs}`,
        `SIMILAR PAST REPORTS (deterministic match, now=${new Date().toISOString()}):\n${blocks.sim}`,
        `MEMORY:\n${memoryBlock(facts)}`,
        `INCIDENTS:\n${incidentBlock(incidents)}`,
        `CONVERSATION SO FAR:\n${transcript || '(start)'}`,
        `Visitor: ${message}`,
      ].join('\n\n');
      decision = await withSpan('llm.decide', 'LLM', { 'llm.model_name': modelId(), 'llm.provider': 'google', 'input.value': prompt }, async (span) => {
        const { object, usage } = await generateObject({ model: chatModel(), schema: DecisionSchema, system: SYSTEM, prompt, providerOptions: chatProviderOptions() });
        span.setAttribute('output.value', JSON.stringify(object));
        if (usage?.inputTokens) span.setAttribute('llm.token_count.prompt', usage.inputTokens);
        if (usage?.outputTokens) span.setAttribute('llm.token_count.completion', usage.outputTokens);
        return object;
      });
    } catch (e) {
      recordsReply(`Model call failed (${e instanceof Error ? e.message.slice(0, 160) : String(e)}).`);
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
    // The model may only link incidents that exist in this space.
    const linked = decision.relatedIncidentId ? incidents.find((i) => i.key === decision.relatedIncidentId) : undefined;

    if (gate.reason === 'location_mismatch') {
      events.push({ type: 'notice', code: 'policy_blocked', message: 'Blocked: the model referenced a different location.' });
    } else if (action === 'SAFETY_HANDOFF') {
      events.push({ type: 'avatar', state: 'escalating' }, { type: 'cue', cue: 'safety', caption: 'Safety alert: stop and get staff.' });
      pushEscalation('Safety issue — contact staff directly', true);
    } else if ((action === 'LINK_EXISTING' || action === 'UPDATE_PORTAL') && linked) {
      events.push({ type: 'incident', incident: toView(linked), relation: 'linked' });
      pushPortalApproval(linked);
      if (linked.status !== 'RESOLVED') pushEscalation(`Already reported ${similar.find((s) => s.incident.key === linked.key)?.agoText ?? ''}`.trim(), urgentAsset(similar.find((s) => s.incident.key === linked.key)), linked.key);
      events.push({ type: 'avatar', state: linked.status === 'RESOLVED' ? 'helping' : 'escalating' });
    } else if (action === 'CREATE_INCIDENT' || action === 'UPDATE_PORTAL' || action === 'REQUEST_MAINTENANCE_CALL') {
      if (action === 'REQUEST_MAINTENANCE_CALL') events.push({ type: 'notice', code: 'policy_blocked', message: 'The bot doesn’t place calls in this demo — use the contact options below, or I can file a ticket.' });
      pushCreateApproval(decision.assetId);
      pushEscalation('Need a person?', false);
      events.push({ type: 'avatar', state: 'escalating' }, { type: 'cue', cue: 'escalating', caption: 'Ready to report this — waiting for your OK.' });
    } else {
      events.push({ type: 'avatar', state: 'helping' });
    }

    // Deterministic guarantee: a strong open match always gets an escalation path, whatever the model chose.
    if (openStrong) {
      pushPortalApproval(openStrong.incident);
      pushEscalation(`Already reported ${openStrong.agoText}`, urgentAsset(openStrong), openStrong.incident.key);
    }

    if (coreBackend() === 'local' && events.some((e) => e.type === 'incident' || e.type === 'approval' || e.type === 'seen_before')) {
      events.push({ type: 'notice', code: 'core_local', message: 'Reports are in the local demo store (SurrealDB Core not configured).' });
    }
    root.setAttribute('output.value', reply);
    events.push({ type: 'completed', outcome: action.toLowerCase(), traceId });
    return events;
  });

  await flushTraces();
  return Response.json({ events });
}
