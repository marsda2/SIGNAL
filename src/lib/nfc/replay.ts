// Anti-replay: accept only a strictly increasing SDM read counter per chip (docs/03 hackathon policy).
//
// HONEST LIMIT: this default store lives in process memory. On Vercel each warm function instance has its own
// copy and a cold start forgets everything, so a replay can succeed against a different instance. Roadmap B
// replaces it with an atomic SurrealDB Core compare-and-swap behind this same interface.

export interface ReplayStore {
  readonly durable: boolean;
  /** Atomically accepts `counter` only if it is higher than the last accepted one for `uid`. */
  consume(uid: string, counter: number): Promise<'consumed' | 'replayed'>;
}

class MemoryReplayStore implements ReplayStore {
  readonly durable = false;
  private last = new Map<string, number>();

  async consume(uid: string, counter: number) {
    const previous = this.last.get(uid);
    if (previous !== undefined && counter <= previous) return 'replayed' as const;
    this.last.set(uid, counter);
    return 'consumed' as const;
  }
}

const globalStore = globalThis as typeof globalThis & { __signalReplayStore?: ReplayStore };

export function replayStore(): ReplayStore {
  return (globalStore.__signalReplayStore ??= new MemoryReplayStore());
}

/** Test/dev hook to swap in the Core-backed store. */
export function setReplayStore(store: ReplayStore) {
  globalStore.__signalReplayStore = store;
}
