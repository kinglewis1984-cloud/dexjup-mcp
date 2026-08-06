#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createServer } from "./server.js";
import { loadKeypair } from "./wallet/keypair.js";

async function main() {
  const config = loadConfig();

  // Fail fast: if trading is enabled, validate the key parses now rather
  // than surfacing a confusing error on the first execute_swap call.
  if (config.tradingEnabled && config.solanaPrivateKey) {
    loadKeypair(config.solanaPrivateKey);
  }

  const server = createServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("dexjup-mcp fatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
