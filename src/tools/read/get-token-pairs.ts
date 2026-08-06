import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DexScreenerClient } from "../../clients/dexscreener.js";
import { toolJson, withToolErrorHandling } from "../util.js";

export function registerGetTokenPairsTool(server: McpServer, deps: { dexscreener: DexScreenerClient }) {
  server.registerTool(
    "get_token_pairs",
    {
      title: "Get pools for a token",
      description:
        "List all DEX pools/pairs for a given token mint/contract address, sorted by 24h volume descending.",
      inputSchema: {
        tokenAddress: z.string().min(1).describe("Token mint (Solana) or contract address"),
        chainId: z.string().default("solana").describe("Chain id, e.g. 'solana', 'ethereum', 'base'"),
      },
    },
    withToolErrorHandling(async ({ tokenAddress, chainId }: { tokenAddress: string; chainId: string }) => {
      const result = await deps.dexscreener.getTokenPairs(chainId, tokenAddress);
      return toolJson({
        source: result.source,
        fetchedAt: new Date(result.fetchedAt).toISOString(),
        pairs: result.value,
      });
    }),
  );
}
