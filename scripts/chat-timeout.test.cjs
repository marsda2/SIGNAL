const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (id) => imports[id] ?? require(id),
    Request, Response, AbortController, console, process, setTimeout, clearTimeout, ...globals });
  return exports;
}
const { withinDeadline } = load('src/lib/deadline.ts', {});
const never = () => new Promise(() => {});

test('deadline releases a hung read and tolerates a late rejection', async () => {
  let reject;
  const pending = new Promise((_, r) => { reject = r; });
  await assert.rejects(withinDeadline('test', 10, () => pending), /timed out/);
  reject(new Error('late failure'));
  await new Promise((r) => setTimeout(r, 10));
});

function chat({ memory = async () => ({ facts: [], queryMs: 1 }), incidents = async () => [],
  model = never, access, flush = async () => {} } = {}) {
  const space = { id: 'room204', name: 'Room 204', assets: [], escalation: {}, faqs: [] };
  const span = { setAttribute() {} };
  return load('src/app/api/chat+api.ts', {
    ai: { generateObject: model },
    '@/lib/agent/contracts': { DecisionSchema: {}, authorizeProposedAction: () => ({ allowed: true }) },
    '@/lib/agent/model': { chatModel: (id) => id, chatProviderOptions() {}, modelId: () => 'test', fallbackModelId: () => 'fast-test' },
    '@/lib/agent/space-context': { findSimilar: () => [], matchFaq: () => ({ q: 'wifi?', a: 'Operator FAQ answer' }), spacePromptBlocks: () => ({}) },
    '@/lib/email': { emailConfigured: () => false }, '@/lib/anchor': {},
    '@/lib/approvals': { issueActionId: () => 'test' },
    '@/lib/access': { sessionFrom: () => null, visitorAccess: access ?? (async () => ({ ok: true, space })), denied: (a) => Response.json({}, { status: a.status }) },
    '@/lib/core': { listIncidents: incidents, coreBackend: () => 'surrealdb', audit: async () => {} },
    '@/lib/env': { flags: {}, integrationConfig: () => ({ agentMemory: true, llm: true }) },
    '@/lib/memory': { recallForLocation: memory },
    '@/lib/tracing': { withSpan: async (_n, _k, _a, fn) => fn(span), traceIdOf: () => undefined, flushTraces: flush },
    // Exercise real deadline behavior with short test durations.
    '@/lib/deadline': { withinDeadline: (stage, _ms, fn) => withinDeadline(stage, 20, fn) },
  });
}
const request = () => new Request('https://signal.test/api/chat', { method: 'POST', body: JSON.stringify({ message: 'wifi?', locationId: 'room204' }) });

test('hung memory, model and tracing still return a labelled records answer', async () => {
  const route = chat({ memory: never, model: never, flush: never });
  const response = await route.POST(request());
  assert.equal(response.status, 200);
  const { events } = await response.json();
  assert.ok(events.some((e) => e.code === 'memory_unavailable'));
  assert.ok(events.some((e) => e.code === 'llm_not_configured'));
  assert.ok(events.some((e) => e.text === 'Operator FAQ answer'));
});

test('hung access fails closed before memory or model', async () => {
  const response = await chat({ access: never, model: () => assert.fail('model must not run') }).POST(request());
  assert.equal(response.status, 503);
});

test('hung Core does not invent an empty history or offer a duplicate ticket', async () => {
  const response = await chat({ incidents: never, model: () => assert.fail('model must not run') }).POST(request());
  const { events } = await response.json();
  assert.ok(events.some((e) => e.code === 'core_unavailable'));
  assert.ok(!events.some((e) => e.type === 'approval'));
});

test('GET is rejected immediately', () => {
  const response = chat().GET();
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
});

test('model receives cancellation and no retries', async () => {
  let signal;
  await chat({ model: async (options) => {
    assert.equal(options.maxRetries, 0);
    signal = options.abortSignal;
    return never();
  } }).POST(request());
  assert.equal(signal.aborted, true);
});

test('fast fallback succeeds after primary failure and passes the policy gate', async () => {
  const calls = [];
  const response = await chat({ model: async ({ model }) => {
    calls.push(model);
    if (model === 'test') throw new Error('primary unavailable');
    return { object: { proposedAction: 'ANSWER', userVisibleExplanation: 'Fallback answer', locationId: 'room204' }, usage: {} };
  } }).POST(request());
  const { events } = await response.json();
  assert.deepEqual(calls, ['test', 'fast-test']);
  assert.ok(events.some((e) => e.text === 'Fallback answer'));
  assert.ok(events.some((e) => e.type === 'completed' && e.outcome === 'answer'));
});
