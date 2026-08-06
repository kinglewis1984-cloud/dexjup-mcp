import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { DexScreenerClient } from "../../clients/dexscreener.js";
import { toolJson, withToolErrorHandling } from "../util.js";

export function registerGetTokenProfilesTool(server: McpServer, deps: { dexscreener: DexScreenerClient }) {
  server.registerTool(
    "get_token_profiles",
    {
      title: "Get trending token profiles",
      description: "List the latest trending/boosted token profiles from DEX Screener, optionally filtered to one chain.",
      inputSchema: {
        chainFilter: z.string().optional().describe("Optional chain id to filter to, e.g. 'solana'"),
      },
    },
    withToolErrorHandling(async ({ chainFilter }: { chainFilter?: string }) => {
      const result = await deps.dexscreener.getTokenProfiles(chainFilter);
      return toolJson({
        source: result.source,
        fetchedAt: new Date(result.fetchedAt).toISOString(),
        profiles: result.value,
      });
    }),
  );
}
