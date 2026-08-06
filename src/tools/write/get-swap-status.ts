import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SolanaRpcClient } from "../../clients/solana-rpc.js";
import { toolJson, withToolErrorHandling } from "../util.js";

export function registerGetSwapStatusTool(server: McpServer, deps: { rpc: SolanaRpcClient }) {
  server.registerTool(
    "get_swap_status",
    {
      title: "Get transaction status",
      description:
        "Check the confirmation status of a previously-submitted transaction signature, e.g. one returned by execute_swap. Read-only.",
      inputSchema: {
        signature: z.string().min(1).describe("Transaction signature to check"),
      },
    },
    withToolErrorHandling(async ({ signature }: { signature: string }) => {
      const status = await deps.rpc.getSignatureStatus(signature);
      return toolJson({
        signature,
        found: status !== null,
        confirmationStatus: status?.confirmationStatus ?? null,
        confirmations: status?.confirmations ?? null,
        err: status?.err ?? null,
      });
    }),
  );
}
