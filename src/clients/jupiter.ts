import type { CacheResult, TtlCache } from "../cache.js";
import { fetchJson, HttpError } from "../http.js";
import type { JupiterQuote, JupiterSwapResponse } from "../types/jupiter.js";

const QUOTE_TTL_MS = 5_000;

export interface JupiterQuoteResult {
  quote: JupiterQuote | null;
  errorCode?: string;
  error?: string;
}

export class JupiterClient {
  constructor(
    private readonly baseUrl: string,
    private readonly cache: TtlCache,
  ) {}

  getQuote(
    inputMint: string,
    outputMint: string,
    amount: number,
    slippageBps: number,
  ): Promise<CacheResult<JupiterQuoteResult>> {
    const key = `jup:quote:${inputMint}:${outputMint}:${amount}:${slippageBps}`;
    const url =
      `${this.baseUrl}/swap/v1/quote?inputMint=${encodeURIComponent(inputMint)}` +
      `&outputMint=${encodeURIComponent(outputMint)}&amount=${amount}&slippageBps=${slippageBps}`;

    return this.cache.getOrFetch(key, QUOTE_TTL_MS, async () => {
      try {
        const quote = await fetchJson<JupiterQuote>(url);
        return { quote };
      } catch (err) {
        // Jupiter returns HTTP 400 with a structured error body for
        // no-route / not-tradable tokens rather than a network failure.
        // Treat that as a normal "no route" result instead of an error.
        if (err instanceof HttpError && err.status === 400) {
          try {
            const parsed = JSON.parse(err.body) as { error?: string; errorCode?: string };
            return { quote: null, error: parsed.error, errorCode: parsed.errorCode ?? "NO_ROUTE" };
          } catch {
            // body wasn't the expected shape; fall through and rethrow
          }
        }
        throw err;
      }
    });
  }

  async buildSwapTransaction(quote: JupiterQuote, userPublicKey: string): Promise<JupiterSwapResponse> {
    const url = `${this.baseUrl}/swap/v1/swap`;
    return fetchJson<JupiterSwapResponse>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: "auto",
      }),
    });
  }
}
