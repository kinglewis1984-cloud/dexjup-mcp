import type { CacheResult, TtlCache } from "../cache.js";
import { fetchJson } from "../http.js";
import type {
  DexScreenerPair,
  DexScreenerPairResponse,
  DexScreenerSearchResponse,
  DexScreenerTokenProfile,
} from "../types/dexscreener.js";

const PAIR_DATA_TTL_MS = 15_000;
const PROFILE_TTL_MS = 60_000;
const MAX_BATCH_TOKENS = 30;

export class DexScreenerClient {
  constructor(
    private readonly baseUrl: string,
    private readonly cache: TtlCache,
  ) {}

  searchPairs(query: string): Promise<CacheResult<DexScreenerPair[]>> {
    const url = `${this.baseUrl}/latest/dex/search?q=${encodeURIComponent(query)}`;
    return this.cache.getOrFetch(`ds:search:${query}`, PAIR_DATA_TTL_MS, async () => {
      const res = await fetchJson<DexScreenerSearchResponse>(url);
      return res.pairs ?? [];
    });
  }

  getTokenPairs(chainId: string, tokenAddress: string): Promise<CacheResult<DexScreenerPair[]>> {
    const url = `${this.baseUrl}/token-pairs/v1/${encodeURIComponent(chainId)}/${encodeURIComponent(tokenAddress)}`;
    return this.cache.getOrFetch(`ds:token-pairs:${chainId}:${tokenAddress}`, PAIR_DATA_TTL_MS, async () => {
      const res = await fetchJson<DexScreenerPair[]>(url);
      return [...res].sort((a, b) => (b.volume?.h24 ?? 0) - (a.volume?.h24 ?? 0));
    });
  }

  getPair(chainId: string, pairId: string): Promise<CacheResult<DexScreenerPair | null>> {
    const url = `${this.baseUrl}/latest/dex/pairs/${encodeURIComponent(chainId)}/${encodeURIComponent(pairId)}`;
    return this.cache.getOrFetch(`ds:pair:${chainId}:${pairId}`, PAIR_DATA_TTL_MS, async () => {
      const res = await fetchJson<DexScreenerPairResponse>(url);
      return res.pair ?? res.pairs?.[0] ?? null;
    });
  }

  getTokens(chainId: string, tokenAddresses: string[]): Promise<CacheResult<DexScreenerPair[]>> {
    if (tokenAddresses.length === 0) {
      throw new Error("tokenAddresses must contain at least one address.");
    }
    if (tokenAddresses.length > MAX_BATCH_TOKENS) {
      throw new Error(`tokenAddresses supports at most ${MAX_BATCH_TOKENS} addresses per call.`);
    }
    const joined = tokenAddresses.join(",");
    const url = `${this.baseUrl}/tokens/v1/${encodeURIComponent(chainId)}/${joined}`;
    return this.cache.getOrFetch(`ds:tokens:${chainId}:${joined}`, PAIR_DATA_TTL_MS, () =>
      fetchJson<DexScreenerPair[]>(url),
    );
  }

  getTokenProfiles(chainFilter?: string): Promise<CacheResult<DexScreenerTokenProfile[]>> {
    const url = `${this.baseUrl}/token-profiles/latest/v1`;
    return this.cache.getOrFetch(`ds:profiles`, PROFILE_TTL_MS, async () => {
      const res = await fetchJson<DexScreenerTokenProfile[]>(url);
      return chainFilter ? res.filter((p) => p.chainId === chainFilter) : res;
    });
  }
}
