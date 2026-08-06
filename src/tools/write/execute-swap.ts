import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { JupiterClient } from "../../clients/jupiter.js";
import { SolanaRpcClient } from "../../clients/solana-rpc.js";
import type { Config } from "../../config.js";
import type { JupiterQuote } from "../../types/jupiter.js";
import { assertSwapAllowed, GuardrailError } from "../../wallet/guardrails.js";
import { loadKeypair } from "../../wallet/keypair.js";
import { toolError, toolJson, withToolErrorHandling } from "../util.js";

function requireQuoteFields(quote: Record<string, unknown>) {
  const { inputMint, outputMint, inAmount, slippageBps, outAmount } = quote;
  if (
    typeof inputMint !== "string" ||
    typeof outputMint !== "string" ||
    typeof inAmount !== "string" ||
    typeof slippageBps !== "number" ||
    typeof outAmount !== "string"
  ) {
    throw new Error(
      "The provided quote is missing required fields. Pass the exact `quote` object returned by get_jupiter_quote (or get_token_overview), unmodified.",
    );
  }
  return { inputMint, outputMint, inAmount, slippageBps, outAmount };
}

export function registerExecuteSwapTool(
  server: McpServer,
  deps: { jupiter: JupiterClient; rpc: SolanaRpcClient; config: Config },
) {
  server.registerTool(
    "execute_swap",
    {
      title: "Execute a live swap",
      description:
        "Executes a REAL on-chain swap using a quote previously obtained from get_jupiter_quote or get_token_overview. Requires TRADING_ENABLED=true on the server and confirm: true on the call. Subject to server-side caps on amount, slippage, and quote freshness regardless of what is requested. This tool is always listed, even when trading is disabled, in which case it returns a structured refusal.",
      inputSchema: {
        quote: z
          .record(z.unknown())
          .describe(
            "The exact `quote` object returned by a prior get_jupiter_quote (or get_token_overview) call, unmodified",
          ),
        quoteFetchedAt: z.string().describe("The `fetchedAt` ISO timestamp returned alongside that quote"),
        confirm: z
          .literal(true)
          .describe("Must be exactly true. Confirms this will submit a real on-chain transaction."),
      },
    },
    withToolErrorHandling(
      async ({
        quote,
        quoteFetchedAt,
        confirm,
      }: {
        quote: Record<string, unknown>;
        quoteFetchedAt: string;
        confirm: true;
      }) => {
        const fields = requireQuoteFields(quote);
        const quoteFetchedAtMs = Date.parse(quoteFetchedAt);
        if (Number.isNaN(quoteFetchedAtMs)) {
          throw new Error("quoteFetchedAt is not a valid ISO timestamp.");
        }

        try {
          assertSwapAllowed(
            {
              tradingEnabled: deps.config.tradingEnabled,
              confirm,
              inputMint: fields.inputMint,
              outputMint: fields.outputMint,
              amount: Number(fields.inAmount),
              slippageBps: fields.slippageBps,
              quoteFetchedAt: quoteFetchedAtMs,
            },
            {
              maxSolPerSwap: deps.config.maxSolPerSwap,
              maxSlippageBps: deps.config.maxSlippageBps,
              quoteFreshnessSeconds: deps.config.quoteFreshnessSeconds,
              allowedOutputMints: deps.config.allowedOutputMints,
              denyMints: deps.config.denyMints,
            },
          );
        } catch (err) {
          if (err instanceof GuardrailError) {
            return toolError(err.message, err.code);
          }
          throw err;
        }

        // Guardrails passed, so trading is enabled and a key is configured.
        const keypair = loadKeypair(deps.config.solanaPrivateKey as string);

        const { swapTransaction } = await deps.jupiter.buildSwapTransaction(
          quote as unknown as JupiterQuote,
          keypair.publicKey.toBase58(),
        );
        const versionedTx = SolanaRpcClient.deserializeTransaction(swapTransaction);
        versionedTx.sign([keypair]);
        const signature = await deps.rpc.sendRawTransaction(versionedTx.serialize());

        return toolJson({
          signature,
          inputMint: fields.inputMint,
          outputMint: fields.outputMint,
          inAmount: fields.inAmount,
          expectedOutAmount: fields.outAmount,
        });
      },
    ),
  );
}
