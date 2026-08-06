import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DexScreenerClient } from "../../clients/dexscreener.js";
import { toolJson, withToolErrorHandling } from "../util.js";

export function registerGetPairTool(server: McpServer, deps: { dexscreener: DexScreenerClient }) {
  server.registerTool(
    "get_pair",
    {
      title: "Get a single DEX pair",
      description: "Get full detail for one specific DEX pair/pool by its pair address.",
      inputSchema: {
        chainId: z.string().min(1).describe("Chain id, e.g. 'solana'"),
        pairId: z.string().min(1).describe("Pair/pool address"),
      },
    },
    withToolErrorHandling(async ({ chainId, pairId }: { chainId: string; pairId: string }) => {
      const result = await deps.dexscreener.getPair(chainId, pairId);
      return toolJson({
        source: result.source,
        fetchedAt: new Date(result.fetchedAt).toISOString(),
        pair: result.value,
      });
    }),
  );
}
