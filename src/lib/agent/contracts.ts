/**
 * SIGNAL contracts — the model PROPOSES, server code AUTHORIZES.
 * Never treat LLM-selected phone numbers, domains, severity or success flags as authority.
 * Source: examples/agent-contracts.ts (docs/04_AGENT_MEMORY_AND_EVALUATION.md).
 */
import { z } from 'zod';

export const DecisionSchema = z.object({
  classification: z.enum([
    'GENERAL_QUESTION',
    'SAFE_TROUBLESHOOT',
    'EXISTING_INCIDENT',
    'NEW_INCIDENT',
    'REQUEST_ESCALATION',
    'SAFETY_HANDOFF',
    'CLARIFY',
  ]),
  locationId: z.string().min(1),
  assetId: z.string().nullable(),
  relatedIncidentId: z.string().nullable(),
  suggestedFix: z.string().max(800).nullable(),
  userVisibleExplanation: z.string().max(1000),
  proposedAction: z.enum([
    'ANSWER',
    'GUIDE',
    'LINK_EXISTING',
    'CREATE_INCIDENT',
    'UPDATE_PORTAL',
    'REQUEST_MAINTENANCE_CALL',
    'SAFETY_HANDOFF',
    'ASK_CLARIFY',
  ]),
  evidenceFactIds: z.array(z.string()).max(10),
  uncertainty: z.enum(['low', 'medium', 'high']),
});
export type AgentDecision = z.infer<typeof DecisionSchema>;

export type ServerAuthorizationContext = {
  signedSessionLocationId: string;
  userApprovedActionId?: string;
  actionId: string;
  isEmergencyOrHazard: boolean;
  hasAllowlistedContact: boolean;
  hasValidMaintenancePortal: boolean;
  operatorEnabledCalls: boolean;
  cooldownActive: boolean;
};

/** Illustrative guard — real code must also check tenancy, roles, TTL, idempotency, origin and intent binding. */
export function authorizeProposedAction(
  decision: AgentDecision,
  context: ServerAuthorizationContext,
): { allowed: boolean; reason: string } {
  if (decision.locationId !== context.signedSessionLocationId) {
    return { allowed: false, reason: 'location_mismatch' };
  }
  if (context.isEmergencyOrHazard) {
    return decision.proposedAction === 'SAFETY_HANDOFF'
      ? { allowed: true, reason: 'safety_handoff_only' }
      : { allowed: false, reason: 'hazard_blocks_normal_tools' };
  }
  if (['ANSWER', 'GUIDE', 'ASK_CLARIFY', 'LINK_EXISTING', 'SAFETY_HANDOFF'].includes(decision.proposedAction)) {
    return { allowed: true, reason: 'no_external_side_effect' };
  }
  if (context.userApprovedActionId !== context.actionId) return { allowed: false, reason: 'approval_required' };
  if (decision.proposedAction === 'UPDATE_PORTAL' && !context.hasValidMaintenancePortal) {
    return { allowed: false, reason: 'no_approved_portal' };
  }
  if (decision.proposedAction === 'REQUEST_MAINTENANCE_CALL') {
    if (!context.operatorEnabledCalls || !context.hasAllowlistedContact || context.cooldownActive) {
      return { allowed: false, reason: 'calling_policy_blocked' };
    }
  }
  return { allowed: true, reason: 'proposed_action_approved_subject_to_full_policy' };
}

export type ActionOutcome = {
  attemptId: string;
  kind: 'PORTAL_UPDATE' | 'MAINTENANCE_CALL' | 'CREATE_INCIDENT';
  state: 'PENDING' | 'INITIATED' | 'VERIFIED' | 'FAILED' | 'PENDING_REVIEW';
  externalReference?: string;
  observedAt?: string;
  evidence?: string;
  traceId?: string;
};

/** Typed chat events (docs/02_SYSTEM_ARCHITECTURE.md). The UI renders these; it never parses free text for state. */
export type ChatEvent =
  | { type: 'avatar'; state: PipState }
  | { type: 'text'; text: string }
  | { type: 'step'; label: string; status: 'started' | 'done' | 'failed' }
  | { type: 'source'; title: string; text: string; occurredAt?: string }
  | { type: 'notice'; code: 'llm_not_configured' | 'memory_unavailable' | 'core_unavailable' | 'core_local' | 'policy_blocked'; message: string }
  | { type: 'incident'; incident: IncidentView; relation: 'linked' | 'created' }
  /** Server-authorized offer. The UI shows a button; nothing happens until the visitor taps it. */
  | { type: 'approval'; actionId: string; kind: 'CREATE_INCIDENT' | 'UPDATE_PORTAL' | 'MAINTENANCE_CALL'; label: string; incidentKey?: string; summary?: string; assetId?: string | null }
  | { type: 'cue'; cue: CueName; caption: string }
  /** Deterministic match against this space's past reports (Core), independent of the model. */
  | { type: 'seen_before'; incident: IncidentView; agoText: string; days: number; strong: boolean; assetName: string }
  /** Contact options the visitor can use themselves (tel:/mailto:/link). Nothing is sent by the bot. */
  | { type: 'escalation'; reason: string; urgent: boolean; options: EscalationOption[] }
  | { type: 'completed'; outcome: string; traceId?: string };

export type IncidentView = {
  key: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  summary: string;
  reportedAt: string;
  updatedAt: string;
  source: string;
  lastNote?: string;
};

export type EscalationOption = { kind: 'call' | 'email' | 'link'; label: string; href: string; detail?: string };

/** What the visitor's browser may know about a space (no NFC UIDs, no internal notes). */
export type PublicSpace = {
  id: string;
  name: string;
  siteName: string;
  description: string;
  assets: { id: string; type: string; name: string }[];
  hasUrgentLine: boolean;
  access: 'nfc' | 'open';
};

export type FaqPreset = { label: string; message: string; source: 'faq' | 'memory' | 'reports'; detail?: string };

export type CueName = 'greeting' | 'thinking' | 'solved' | 'escalating' | 'safety';

export type PipState = 'idle' | 'listening' | 'thinking' | 'helping' | 'solved' | 'escalating';
