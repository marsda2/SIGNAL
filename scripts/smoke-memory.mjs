// Fail-fast check from docs/06 §B: can we write a sourced fact and recall it?
// Run: npm run smoke:memory   (loads .env.local via node --env-file)
import { AgentMemory } from '@surrealdb/memory';

const { AGENT_MEMORY_ENDPOINT, AGENT_MEMORY_CONTEXT_ID, AGENT_MEMORY_API_KEY } = process.env;
if (!AGENT_MEMORY_ENDPOINT || !AGENT_MEMORY_CONTEXT_ID || !AGENT_MEMORY_API_KEY) {
  console.error('Missing AGENT_MEMORY_* env vars. Fill .env.local first.');
  process.exit(1);
}

const mem = new AgentMemory({
  endpoint: AGENT_MEMORY_ENDPOINT.replace(/\/+$/, ''),
  context: AGENT_MEMORY_CONTEXT_ID,
  apiKey: AGENT_MEMORY_API_KEY,
});

await mem.health();
console.log('health: ok');

const stamp = new Date().toISOString();
await mem.remember(
  `SOURCE: smoke-test ${stamp}\nLocation: Conference Room 204\nSmoke test: projector HDMI 1 input verified.`,
  { infer: 'none', labels: ['location=room204', 'demo=true', 'kind=smoke'] },
);
console.log('remember: ok');

const res = await mem.recall('What happened previously with the Room 204 projector?', {
  k: 5,
  mode: 'hybrid',
  labels: ['location=room204'],
});
console.log('recall hits:', res.hits?.length ?? 0, 'trace:', res.trace?.traceId ?? '-');
for (const h of res.hits ?? []) console.log('-', JSON.stringify(h).slice(0, 200));
