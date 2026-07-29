type CacheEntry = {
  value: unknown;
  storedAt: number;
};

const values = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

export function peekConsoleQuery<T>(key: string, maxAgeMs: number): T | null {
  const entry = values.get(key);
  if (!entry || Date.now() - entry.storedAt > maxAgeMs) return null;
  return entry.value as T;
}

export function setConsoleQuery<T>(key: string, value: T): void {
  values.set(key, { value, storedAt: Date.now() });
}

export async function loadConsoleQuery<T>(
  key: string,
  loader: () => Promise<T>,
  options: { fresh?: boolean; maxAgeMs?: number } = {},
): Promise<T> {
  const maxAgeMs = options.maxAgeMs ?? 30_000;
  if (!options.fresh) {
    const cached = peekConsoleQuery<T>(key, maxAgeMs);
    if (cached !== null) return cached;
    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;
  }

  const request = loader()
    .then((value) => {
      setConsoleQuery(key, value);
      return value;
    })
    .finally(() => {
      if (inflight.get(key) === request) inflight.delete(key);
    });
  inflight.set(key, request);
  return request;
}

export function invalidateConsoleQuery(keyPrefix?: string): void {
  if (!keyPrefix) {
    values.clear();
    inflight.clear();
    return;
  }
  for (const key of values.keys()) {
    if (key.startsWith(keyPrefix)) values.delete(key);
  }
  for (const key of inflight.keys()) {
    if (key.startsWith(keyPrefix)) inflight.delete(key);
  }
}
