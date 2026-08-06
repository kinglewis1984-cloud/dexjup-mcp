import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { TtlCache } from "./cache.js";
import { DexScreenerClient } from "./clients/dexscreener.js";
import { JupiterClient } from "./clients/jupiter.js";
import { SolanaRpcClient } from "./clients/solana-rpc.js";
import type { Config } from "./config.js";
import { registerGetTokenOverviewTool } from "./tools/aggregate/get-token-overview.js";
import { registerGetJupiterQuoteTool } from "./tools/read/get-jupiter-quote.js";
import { registerGetPairTool } from "./tools/read/get-pair.js";
import { registerGetTokenPairsTool } from "./tools/read/get-token-pairs.js";
import { registerGetTokenProfilesTool } from "./tools/read/get-token-profiles.js";
import { registerGetTokensTool } from "./tools/read/get-tokens.js";
import { registerGetWalletBalanceTool } from "./tools/read/get-wallet-balance.js";
import { registerSearchPairsTool } from "./tools/read/search-pairs.js";
import { registerExecuteSwapTool } from "./tools/write/execute-swap.js";
import { registerGetSwapStatusTool } from "./tools/write/get-swap-status.js";

export function createServer(config: Config): McpServer {
  const server = new McpServer({
    name: "dexjup-mcp",
    version: "0.1.0",
  });

  const cache = new TtlCache();
  const dexscreener = new DexScreenerClient(config.dexscreenerBaseUrl, cache);
  const jupiter = new JupiterClient(config.jupiterBaseUrl, cache);
  const rpc = new SolanaRpcClient(config.rpcUrl);

  server.registerTool(
    "ping",
    {
      title: "Ping",
      description: "Health check tool. Returns pong plus the current server time.",
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ ok: true, message: "pong", time: new Date().toISOString() }),
        },
      ],
    }),
  );

  registerSearchPairsTool(server, { dexscreener });
  registerGetTokenPairsTool(server, { dexscreener });
  registerGetPairTool(server, { dexscreener });
  registerGetTokensTool(server, { dexscreener });
  registerGetTokenProfilesTool(server, { dexscreener });
  registerGetJupiterQuoteTool(server, { jupiter });
  registerGetTokenOverviewTool(server, { dexscreener, jupiter });
  registerGetWalletBalanceTool(server, { rpc });
  registerGetSwapStatusTool(server, { rpc });
  registerExecuteSwapTool(server, { jupiter, rpc, config });

  return server;
}
