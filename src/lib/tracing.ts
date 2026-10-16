// Server-only. Arize Phoenix tracing via OpenTelemetry. No-op unless PHOENIX_COLLECTOR_ENDPOINT is set.
// Spans use OpenInference attribute names so Phoenix renders them as CHAIN / RETRIEVER / LLM / TOOL.
import { SpanStatusCode, trace, type Attributes, type Span } from '@opentelemetry/api';
import { register } from '@arizeai/phoenix-otel';

type Provider = ReturnType<typeof register>;
const g = globalThis as unknown as { __signalTracer?: Provider | null };

function provider(): Provider | null {
  if (g.__signalTracer !== undefined) return g.__signalTracer;
  const url = process.env.PHOENIX_COLLECTOR_ENDPOINT?.trim();
  if (!url) return (g.__signalTracer = null);
  try {
    g.__signalTracer = register({
      projectName: process.env.PHOENIX_PROJECT?.trim() || 'signal-hackathon',
      url,
      apiKey: process.env.PHOENIX_API_KEY?.trim() || undefined,
      batch: false, // serverless: export each span immediately
    });
  } catch (e) {
    console.error('[tracing] Phoenix register failed', e);
    g.__signalTracer = null;
  }
  return g.__signalTracer;
}

export const tracingEnabled = () => provider() !== null;

export type SpanKind = 'CHAIN' | 'RETRIEVER' | 'LLM' | 'TOOL' | 'GUARDRAIL';

/** Runs `fn` inside a span. Returns fn's result; records exceptions. */
export async function withSpan<T>(name: string, kind: SpanKind, attrs: Attributes, fn: (span: Span) => Promise<T>): Promise<T> {
  const p = provider();
  const tracer = (p ?? trace).getTracer('signal');
  return tracer.startActiveSpan(name, { attributes: { 'openinference.span.kind': kind, ...attrs } }, async (span) => {
    try {
      const out = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return out;
    } catch (e) {
      span.recordException(e as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: e instanceof Error ? e.message : String(e) });
      throw e;
    } finally {
      span.end();
    }
  });
}

export const traceIdOf = (span: Span) => {
  const id = span.spanContext().traceId;
  return /^0+$/.test(id) ? undefined : id;
};

export async function flushTraces() {
  try {
    await provider()?.forceFlush();
  } catch (e) {
    console.error('[tracing] flush failed', e);
  }
}
