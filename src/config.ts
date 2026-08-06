import { z } from "zod";

const baseEnvSchema = z.object({
  RPC_URL: z.string().url().default("https://api.mainnet-beta.solana.com"),
  TRADING_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  MAX_SOL_PER_SWAP: z.coerce.number().positive().default(0.5),
  MAX_SLIPPAGE_BPS: z.coerce.number().int().positive().max(10_000).default(500),
  QUOTE_FRESHNESS_SECONDS: z.coerce.number().int().positive().default(30),
  DEXSCREENER_BASE_URL: z.string().url().default("https://api.dexscreener.com"),
  JUPITER_BASE_URL: z.string().url().default("https://api.jup.ag"),
  ALLOWED_OUTPUT_MINTS: z.string().optional(),
  DENY_MINTS: z.string().optional(),
});

export interface Config {
  rpcUrl: string;
  tradingEnabled: boolean;
  /** Only populated when tradingEnabled is true. Never logged. */
  solanaPrivateKey?: string;
  maxSolPerSwap: number;
  maxSlippageBps: number;
  quoteFreshnessSeconds: number;
  dexscreenerBaseUrl: string;
  jupiterBaseUrl: string;
  allowedOutputMints?: string[];
  denyMints?: string[];
}

function splitList(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/**
 * Loads and validates server configuration from environment variables.
 * SOLANA_PRIVATE_KEY is deliberately excluded from the base schema and only
 * read from `env` when TRADING_ENABLED is true, so read-only usage never
 * touches key material at all.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = baseEnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  const cfg = parsed.data;

  let solanaPrivateKey: string | undefined;
  if (cfg.TRADING_ENABLED) {
    const raw = env.SOLANA_PRIVATE_KEY;
    if (!raw || raw.trim() === "") {
      throw new Error(
        "TRADING_ENABLED=true requires SOLANA_PRIVATE_KEY to be set (base58 string or JSON byte-array string).",
      );
    }
    solanaPrivateKey = raw;
  }

  return {
    rpcUrl: cfg.RPC_URL,
    tradingEnabled: cfg.TRADING_ENABLED,
    solanaPrivateKey,
    maxSolPerSwap: cfg.MAX_SOL_PER_SWAP,
    maxSlippageBps: cfg.MAX_SLIPPAGE_BPS,
    quoteFreshnessSeconds: cfg.QUOTE_FRESHNESS_SECONDS,
    dexscreenerBaseUrl: cfg.DEXSCREENER_BASE_URL,
    jupiterBaseUrl: cfg.JUPITER_BASE_URL,
    allowedOutputMints: splitList(cfg.ALLOWED_OUTPUT_MINTS),
    denyMints: splitList(cfg.DENY_MINTS),
  };
}
