interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
  expiresAt: number;
}

export interface CacheResult<T> {
  value: T;
  fetchedAt: number;
  source: "cache" | "live";
}

/**
 * In-memory TTL cache with get-or-fetch dedup: concurrent callers for the
 * same key while a fetch is in flight share one underlying call instead of
 * each triggering their own.
 */
export class TtlCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private inFlight = new Map<string, Promise<unknown>>();

  async getOrFetch<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<CacheResult<T>> {
    const now = Date.now();
    const cached = this.store.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > now) {
      return { value: cached.value, fetchedAt: cached.fetchedAt, source: "cache" };
    }

    const existing = this.inFlight.get(key) as Promise<T> | undefined;
    if (existing) {
      const value = await existing;
      const entry = this.store.get(key) as CacheEntry<T>;
      return { value, fetchedAt: entry.fetchedAt, source: "live" };
    }

    const promise = fetcher();
    this.inFlight.set(key, promise);
    try {
      const value = await promise;
      const fetchedAt = Date.now();
      this.store.set(key, { value, fetchedAt, expiresAt: fetchedAt + ttlMs });
      return { value, fetchedAt, source: "live" };
    } finally {
      this.inFlight.delete(key);
    }
  }

  clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }
}
