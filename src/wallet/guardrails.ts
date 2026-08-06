export const SOL_MINT = "So11111111111111111111111111111111111111112";

export class GuardrailError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "GuardrailError";
    this.code = code;
  }
}

export interface SwapGuardrailInput {
  tradingEnabled: boolean;
  confirm: boolean;
  inputMint: string;
  outputMint: string;
  /** Amount in the input mint's smallest unit (lamports for SOL). */
  amount: number;
  slippageBps: number;
  /** Epoch ms when the quote being executed against was fetched. */
  quoteFetchedAt: number;
  /** Injectable for tests; defaults to Date.now(). */
  now?: number;
}

export interface GuardrailConfig {
  maxSolPerSwap: number;
  maxSlippageBps: number;
  quoteFreshnessSeconds: number;
  allowedOutputMints?: string[];
  denyMints?: string[];
}

/**
 * Runs every execute_swap safety check. Throws GuardrailError on the first
 * failing check (cheapest/most fundamental checks first) or returns
 * normally if the swap is allowed to proceed.
 */
export function assertSwapAllowed(input: SwapGuardrailInput, config: GuardrailConfig): void {
  if (!input.tradingEnabled) {
    throw new GuardrailError(
      "TRADING_DISABLED",
      "Trading is disabled on this server. Set TRADING_ENABLED=true in the server environment to allow execute_swap.",
    );
  }

  if (input.confirm !== true) {
    throw new GuardrailError("CONFIRM_REQUIRED", "execute_swap requires confirm: true to proceed.");
  }

  if (
    config.denyMints?.includes(input.inputMint) ||
    config.denyMints?.includes(input.outputMint)
  ) {
    throw new GuardrailError("MINT_DENIED", "One of the requested mints is on the DENY_MINTS list.");
  }

  if (
    config.allowedOutputMints &&
    config.allowedOutputMints.length > 0 &&
    !config.allowedOutputMints.includes(input.outputMint)
  ) {
    throw new GuardrailError(
      "MINT_NOT_ALLOWED",
      `outputMint ${input.outputMint} is not in ALLOWED_OUTPUT_MINTS.`,
    );
  }

  if (input.inputMint === SOL_MINT) {
    const solAmount = input.amount / 1_000_000_000;
    if (solAmount > config.maxSolPerSwap) {
      throw new GuardrailError(
        "AMOUNT_EXCEEDS_CAP",
        `Requested ${solAmount} SOL exceeds MAX_SOL_PER_SWAP cap of ${config.maxSolPerSwap} SOL.`,
      );
    }
  }

  if (input.slippageBps > config.maxSlippageBps) {
    throw new GuardrailError(
      "SLIPPAGE_EXCEEDS_CAP",
      `Requested slippage ${input.slippageBps}bps exceeds MAX_SLIPPAGE_BPS cap of ${config.maxSlippageBps}bps.`,
    );
  }

  const now = input.now ?? Date.now();
  const ageSeconds = (now - input.quoteFetchedAt) / 1000;
  if (ageSeconds > config.quoteFreshnessSeconds) {
    throw new GuardrailError(
      "QUOTE_STALE",
      `Quote is ${ageSeconds.toFixed(1)}s old, exceeding the freshness limit of ${config.quoteFreshnessSeconds}s. Fetch a new quote and retry.`,
    );
  }
}
