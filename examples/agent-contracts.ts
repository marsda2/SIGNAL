/**
 * SIGNAL contract examples — architectural starter, not a functioning backend.
 * Validate model output, then enforce permissions with ordinary server code.
 * Never treat LLM-selected phone numbers, domains, severity or success as authority.
 */
import { z } from 'zod';

export const DecisionSchema = z.object({
  classification: z.enum([
    'GENERAL_QUESTION', 'SAFE_TROUBLESHOOT', 'EXISTING_INCIDENT',
    'NEW_INCIDENT', 'REQUEST_ESCALATION', 'SAFETY_HANDOFF', 'CLARIFY',
  ]),
  locationId: z.string().min(1),
  assetId: z.string().nullable(),
  relatedIncidentId: z.string().nullable(),
  suggestedFix: z.string().max(800).nullable(),
  userVisibleExplanation: z.string().max(1000),
  // The model proposes only. Server-side policy independently computes authority.
  proposedAction: z.enum([
    'ANSWER', 'GUIDE', 'LINK_EXISTING', 'CREATE_INCIDENT',
    'UPDATE_PORTAL', 'REQUEST_MAINTENANCE_CALL', 'SAFETY_HANDOFF', 'ASK_CLARIFY',
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

/**
 * Illustrative guard; real code must also check tenancy, roles, ownership, TTL,
 * idempotency, origin, concurrency and the exact intent bound to the approval.
 */
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
  const explicitApproval = context.userApprovedActionId === context.actionId;
  if (!explicitApproval) return { allowed: false, reason: 'approval_required' };
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
  kind: 'PORTAL_UPDATE'|'MAINTENANCE_CALL'|'CREATE_INCIDENT';
  state: 'PENDING'|'INITIATED'|'VERIFIED'|'FAILED'|'PENDING_REVIEW';
  externalReference?: string;
  observedAt?: string;
  evidence?: string;
  traceId?: string;
};
