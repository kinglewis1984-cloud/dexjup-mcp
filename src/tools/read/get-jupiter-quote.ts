import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { JupiterClient } from "../../clients/jupiter.js";
import { toolJson, withToolErrorHandling } from "../util.js";

const DEFAULT_SLIPPAGE_BPS = 50;

export function registerGetJupiterQuoteTool(server: McpServer, deps: { jupiter: JupiterClient }) {
  server.registerTool(
    "get_jupiter_quote",
    {
      title: "Get a Jupiter swap quote",
      description:
        "Get a live Jupiter swap quote. Read-only — no wallet needed, executes nothing. Amounts are in the input mint's smallest unit (e.g. lamports for SOL). The returned quote is required as input to execute_swap.",
      inputSchema: {
        inputMint: z.string().min(1).describe("Input token mint address"),
        outputMint: z.string().min(1).describe("Output token mint address"),
        amount: z.coerce.number().positive().describe("Amount in the input mint's smallest unit, e.g. lamports for SOL"),
        slippageBps: z.coerce
          .number()
          .int()
          .positive()
          .optional()
          .describe(`Slippage tolerance in basis points; defaults to ${DEFAULT_SLIPPAGE_BPS}`),
      },
    },
    withToolErrorHandling(
      async ({
        inputMint,
        outputMint,
        amount,
        slippageBps,
      }: {
        inputMint: string;
        outputMint: string;
        amount: number;
        slippageBps?: number;
      }) => {
        const bps = slippageBps ?? DEFAULT_SLIPPAGE_BPS;
        const result = await deps.jupiter.getQuote(inputMint, outputMint, amount, bps);
        return toolJson({
          source: result.source,
          fetchedAt: new Date(result.fetchedAt).toISOString(),
          quote: result.value.quote,
          errorCode: result.value.errorCode,
          error: result.value.error,
        });
      },
    ),
  );
}
