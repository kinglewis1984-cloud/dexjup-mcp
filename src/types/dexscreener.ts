export interface DexScreenerTokenInfo {
  address: string;
  name: string;
  symbol: string;
}

export interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  labels?: string[];
  baseToken: DexScreenerTokenInfo;
  quoteToken: DexScreenerTokenInfo;
  priceNative: string;
  priceUsd?: string;
  txns?: Record<string, { buys: number; sells: number }>;
  volume?: Record<string, number>;
  priceChange?: Record<string, number>;
  liquidity?: { usd?: number; base?: number; quote?: number };
  fdv?: number;
  marketCap?: number;
  info?: {
    imageUrl?: string;
    websites?: { url: string; label?: string }[];
    socials?: { url: string; type: string }[];
  };
}

export interface DexScreenerSearchResponse {
  schemaVersion?: string;
  pairs: DexScreenerPair[] | null;
}

export interface DexScreenerPairResponse {
  schemaVersion?: string;
  pairs?: DexScreenerPair[] | null;
  pair?: DexScreenerPair | null;
}

export interface DexScreenerTokenProfile {
  url: string;
  chainId: string;
  tokenAddress: string;
  icon?: string;
  header?: string;
  description?: string;
  links?: { type: string; url: string; label?: string }[];
}
