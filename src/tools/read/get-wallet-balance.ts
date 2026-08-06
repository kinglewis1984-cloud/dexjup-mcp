import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SolanaRpcClient } from "../../clients/solana-rpc.js";
import { getCachedPublicKey } from "../../wallet/keypair.js";
import { toolJson, withToolErrorHandling } from "../util.js";

export function registerGetWalletBalanceTool(server: McpServer, deps: { rpc: SolanaRpcClient }) {
  server.registerTool(
    "get_wallet_balance",
    {
      title: "Get wallet balance",
      description:
        "Get the SOL balance (and optionally an SPL token balance) for a wallet address. If walletAddress is omitted, defaults to the server's configured trading wallet when trading is enabled.",
      inputSchema: {
        walletAddress: z
          .string()
          .optional()
          .describe("Wallet address to check; defaults to the server's configured wallet if trading is enabled"),
        mintAddress: z.string().optional().describe("Optional SPL token mint to also check the balance of"),
      },
    },
    withToolErrorHandling(
      async ({ walletAddress, mintAddress }: { walletAddress?: string; mintAddress?: string }) => {
        const address = walletAddress ?? getCachedPublicKey() ?? undefined;
        if (!address) {
          throw new Error(
            "No walletAddress provided and no server wallet is configured (trading disabled). Pass walletAddress explicitly.",
          );
        }
        const solBalance = await deps.rpc.getSolBalance(address);
        const result: Record<string, unknown> = { address, solBalance };
        if (mintAddress) {
          result.tokenBalance = await deps.rpc.getTokenBalance(address, mintAddress);
        }
        return toolJson(result);
      },
    ),
  );
}
