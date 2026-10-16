// Client-safe. Holds the signed visitor session from a verified NFC tap for this browser tab only,
// and builds the headers visitor API calls need. Tokens never go in URLs.

const SESSION_KEY = 'signal.visitorSession';
const OPERATOR_KEY = 'signal.operatorSecret'; // set by /admin/spaces; lets an operator preview NFC-only spaces

let memoryToken: string | null = null;

function storage(): Storage | undefined {
  try {
    return globalThis.sessionStorage ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveVisitorSession(token: string) {
  memoryToken = token;
  try {
    storage()?.setItem(SESSION_KEY, token);
  } catch {
    /* tab-only convenience; memory copy still works until reload */
  }
}

export function loadVisitorSession(): string | null {
  try {
    return storage()?.getItem(SESSION_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

export function visitorHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { ...extra };
  const token = loadVisitorSession();
  if (token) h['x-signal-session'] = token;
  try {
    const op = storage()?.getItem(OPERATOR_KEY);
    if (op) h['x-demo-secret'] = op;
  } catch {
    /* ignore */
  }
  return h;
}
