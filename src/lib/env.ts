// Server-only env access. Import from src/app/api/** and src/lib/** only, never from screens.

export class ConfigError extends Error {}

export function requireEnv(...names: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) out[name] = value;
    else missing.push(name);
  }
  if (missing.length) throw new ConfigError(`${missing.join(', ')} not set (add to .env.local or Vercel env)`);
  return out;
}

/** Which integrations have credentials. Booleans only — values never leave the server. */
export function integrationConfig() {
  const has = (...names: string[]) => names.every((n) => Boolean(process.env[n]?.trim()));
  return {
    agentMemory: has('AGENT_MEMORY_ENDPOINT', 'AGENT_MEMORY_CONTEXT_ID', 'AGENT_MEMORY_API_KEY'),
    surrealCore: has('SURREALDB_URL', 'SURREALDB_USERNAME', 'SURREALDB_PASSWORD'),
    llm: has('ANTHROPIC_API_KEY'),
    daytona: has('DAYTONA_API_KEY'),
    anchor: has('ANCHORBROWSER_API_KEY'),
    elevenlabs: has('ELEVENLABS_API_KEY'),
    elevenlabsCalls: has('ELEVENLABS_API_KEY', 'ELEVENLABS_AGENT_ID', 'ELEVENLABS_AGENT_PHONE_NUMBER_ID'),
    phoenix: has('PHOENIX_COLLECTOR_ENDPOINT'),
  };
}

export const flags = {
  nfcMode: (process.env.NFC_MODE === 'verified' ? 'verified' : 'simulated') as 'verified' | 'simulated',
  anchorActions: process.env.ENABLE_ANCHOR_ACTIONS === 'true',
  outboundCalls: process.env.ENABLE_OUTBOUND_CALLS === 'true',
};

/** Guard for demo-only mutating routes. */
export function isOperator(request: Request): boolean {
  const secret = process.env.DEMO_OPERATOR_LOGIN_SECRET?.trim();
  return Boolean(secret) && request.headers.get('x-demo-secret') === secret;
}
