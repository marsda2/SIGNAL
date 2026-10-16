/**
 * Official SurrealDB Agent Memory SDK usage as of October 16, 2026.
 * Requires a DEPLOYED context and registered scopes.
 * Note: SurrealDB Core (operations DB) uses a separate `surrealdb` SDK.
 */
import { AgentMemory } from '@surrealdb/memory';

const scope = [process.env.AGENT_MEMORY_SCOPE!];
const memory = new AgentMemory({
  endpoint: process.env.AGENT_MEMORY_ENDPOINT!,
  context: process.env.AGENT_MEMORY_CONTEXT_ID!,
  apiKey: process.env.AGENT_MEMORY_API_KEY!,
  timeout: 30000,
});

export async function recallRoomEvidence(question: string) {
  // Scope is a registered hierarchical path, not an arbitrary user-controlled ID.
  return memory.recall(question, { scope, k: 5 });
}

export async function rememberVerifiedResolution(input: {
  incidentId: string;
  equipment: string;
  fix: string;
  confirmedAtISO: string;
  verifiedByRole: 'technician'|'operator';
}) {
  // Include provenance in fact text. Keep event graph separately in Core DB.
  const fact = [
    `Verified ${input.equipment} resolution in Room 204: ${input.fix}.`,
    `Incident source: ${input.incidentId}.`,
    `Confirmed at ${input.confirmedAtISO} by ${input.verifiedByRole}.`,
  ].join(' ');
  return memory.remember(fact, { scope, infer: 'full' });
}

// Smoke test, after filling env and registering the scope:
// await rememberVerifiedResolution({incidentId:'T-103', equipment:'projector',
//   fix:'Replaced damaged HDMI cable',confirmedAtISO:new Date().toISOString(),verifiedByRole:'technician'});
// console.log(await recallRoomEvidence('What previously broke on the projector?'));
