import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DexScreenerClient } from "../../clients/dexscreener.js";
import type { JupiterClient } from "../../clients/jupiter.js";
import { toolJson, withToolErrorHandling } from "../util.js";

const SOL_MINT = "So11111111111111111111111111111111111111112";
// Fixed reference size (1 SOL) so quotes are comparable across tokens.
const REFERENCE_SOL_AMOUNT_LAMPORTS = 1_000_000_000;
const REFERENCE_SLIPPAGE_BPS = 50;

export function registerGetTokenOverviewTool(
  server: McpServer,
  deps: { dexscreener: DexScreenerClient; jupiter: JupiterClient },
) {
  server.registerTool(
    "get_token_overview",
    {
      title: "Get a merged token overview",
      description:
        "Combines DEX Screener market data (liquidity, volume, price change, socials) with a live Jupiter reference quote (1 SOL -> token) into one enriched response. Degrades gracefully: if the token has no DEX Screener listing or no Jupiter route, the other half of the response is still returned.",
      inputSchema: {
        tokenAddress: z.string().min(1).describe("Token mint/contract address"),
        chainId: z.string().default("solana").describe("Chain id, e.g. 'solana'"),
      },
    },
    withToolErrorHandling(
      async ({ tokenAddress, chainId }: { tokenAddress: string; chainId: string }) => {
        const dsResult = await deps.dexscreener.getTokenPairs(chainId, tokenAddress);
        const bestPair = dsResult.value[0] ?? null;

        const canQuote = chainId === "solana" && tokenAddress !== SOL_MINT;
        let jupiterQuote = null;
        let jupiterError: string | undefined;
        let jupiterSource: "cache" | "live" | "skipped" = "skipped";
        let jupiterFetchedAt: string | undefined;

        if (canQuote) {
          const jupResult = await deps.jupiter.getQuote(
            SOL_MINT,
            tokenAddress,
            REFERENCE_SOL_AMOUNT_LAMPORTS,
            REFERENCE_SLIPPAGE_BPS,
          );
          jupiterQuote = jupResult.value.quote;
          jupiterError = jupResult.value.errorCode ?? jupResult.value.error;
          jupiterSource = jupResult.source;
          jupiterFetchedAt = new Date(jupResult.fetchedAt).toISOString();
        }

        return toolJson({
          tokenAddress,
          chainId,
          dexscreener: {
            source: dsResult.source,
            fetchedAt: new Date(dsResult.fetchedAt).toISOString(),
            poolCount: dsResult.value.length,
            bestPair,
          },
          jupiter: {
            source: jupiterSource,
            fetchedAt: jupiterFetchedAt,
            referenceInputSol: canQuote ? 1 : null,
            quote: jupiterQuote,
            error: jupiterError,
          },
        });
      },
    ),
  );
}
