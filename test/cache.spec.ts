import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "../src/cache.js";

describe("TtlCache", () => {
  it("returns a fresh value as source=live on first fetch", async () => {
    const cache = new TtlCache();
    const fetcher = vi.fn().mockResolvedValue("value-1");
    const result = await cache.getOrFetch("k", 1000, fetcher);
    expect(result).toEqual({ value: "value-1", fetchedAt: result.fetchedAt, source: "live" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("serves subsequent calls within TTL from cache without refetching", async () => {
    const cache = new TtlCache();
    const fetcher = vi.fn().mockResolvedValue("value-1");
    await cache.getOrFetch("k", 10_000, fetcher);
    const second = await cache.getOrFetch("k", 10_000, fetcher);
    expect(second.source).toBe("cache");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("refetches after the TTL expires", async () => {
    vi.useFakeTimers();
    try {
      const cache = new TtlCache();
      const fetcher = vi.fn().mockResolvedValue("value-1");
      await cache.getOrFetch("k", 50, fetcher);
      vi.advanceTimersByTime(51);
      const second = await cache.getOrFetch("k", 50, fetcher);
      expect(second.source).toBe("live");
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("dedups concurrent in-flight requests for the same key into one fetch", async () => {
    const cache = new TtlCache();
    let resolveFetch!: (v: string) => void;
    const fetcher = vi.fn().mockImplementation(
      () => new Promise<string>((resolve) => (resolveFetch = resolve)),
    );

    const p1 = cache.getOrFetch("k", 1000, fetcher);
    const p2 = cache.getOrFetch("k", 1000, fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    resolveFetch("shared-value");

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.value).toBe("shared-value");
    expect(r2.value).toBe("shared-value");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps separate keys independent", async () => {
    const cache = new TtlCache();
    const fetcherA = vi.fn().mockResolvedValue("a");
    const fetcherB = vi.fn().mockResolvedValue("b");
    const a = await cache.getOrFetch("a", 1000, fetcherA);
    const b = await cache.getOrFetch("b", 1000, fetcherB);
    expect(a.value).toBe("a");
    expect(b.value).toBe("b");
  });
});
