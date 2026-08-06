import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DexScreenerClient } from "../../clients/dexscreener.js";
import { toolJson, withToolErrorHandling } from "../util.js";

export function registerGetTokensTool(server: McpServer, deps: { dexscreener: DexScreenerClient }) {
  server.registerTool(
    "get_tokens",
    {
      title: "Batch token lookup",
      description:
        "Look up DEX pair data for up to 30 token addresses in a single call. Use this instead of repeated get_token_pairs calls when checking a list of tokens.",
      inputSchema: {
        tokenAddresses: z
          .array(z.string().min(1))
          .min(1)
          .max(30)
          .describe("Up to 30 token mint/contract addresses"),
        chainId: z.string().default("solana").describe("Chain id, e.g. 'solana'"),
      },
    },
    withToolErrorHandling(
      async ({ tokenAddresses, chainId }: { tokenAddresses: string[]; chainId: string }) => {
        const result = await deps.dexscreener.getTokens(chainId, tokenAddresses);
        return toolJson({
          source: result.source,
          fetchedAt: new Date(result.fetchedAt).toISOString(),
          pairs: result.value,
        });
      },
    ),
  );
}
