/** Bound the caller's wait, even when a provider ignores cancellation. Only use for reads/telemetry. */
export async function withinDeadline<T>(stage: string, milliseconds: number, work: () => Promise<T>): Promise<T> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let status = 'ok';
  try {
    return await Promise.race([
      Promise.resolve().then(work),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${stage} timed out after ${milliseconds}ms`)), milliseconds);
      }),
    ]);
  } catch (error) {
    status = 'failed';
    throw error;
  } finally {
    clearTimeout(timer);
    console.info(JSON.stringify({ evt: 'chat.stage', stage, status, elapsedMs: Date.now() - started }));
  }
}
