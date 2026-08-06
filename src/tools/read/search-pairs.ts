import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DexScreenerClient } from "../../clients/dexscreener.js";
import { toolJson, withToolErrorHandling } from "../util.js";

export function registerSearchPairsTool(server: McpServer, deps: { dexscreener: DexScreenerClient }) {
  server.registerTool(
    "search_pairs",
    {
      title: "Search DEX pairs",
      description:
        "Search DEX Screener for trading pairs matching free text, e.g. a token symbol or a pair like 'SOL/USDC'. Not scoped to one chain.",
      inputSchema: {
        query: z.string().min(1).describe("Search text, e.g. token symbol or 'SOL/USDC'"),
      },
    },
    withToolErrorHandling(async ({ query }: { query: string }) => {
      const result = await deps.dexscreener.searchPairs(query);
      return toolJson({
        source: result.source,
        fetchedAt: new Date(result.fetchedAt).toISOString(),
        pairs: result.value,
      });
    }),
  );
}
