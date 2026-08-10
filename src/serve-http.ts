#!/usr/bin/env node
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { NextFunction, Request, Response } from "express";
import { loadConfig } from "./config.js";
import { createServer } from "./server.js";
import { loadKeypair } from "./wallet/keypair.js";

const config = loadConfig();

// Same fail-fast as index.ts: validate the key parses at boot, not on the
// first execute_swap call from a remote client.
if (config.tradingEnabled && config.solanaPrivateKey) {
  loadKeypair(config.solanaPrivateKey);
}

const AUTH_TOKEN = process.env.MCP_HTTP_AUTH_TOKEN;
if (!AUTH_TOKEN || AUTH_TOKEN.trim() === "") {
  console.error(
    "serve-http fatal: MCP_HTTP_AUTH_TOKEN must be set — this endpoint is " +
      "reachable from the public internet and must not run unauthenticated.",
  );
  process.exit(1);
}

function requireBearerToken(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || token !== AUTH_TOKEN) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Unauthorized" },
      id: null,
    });
    return;
  }
  next();
}

const app = createMcpExpressApp({ host: "0.0.0.0" });

app.get("/healthz", (_req, res) => {
  res.status(200).json({ ok: true, tradingEnabled: config.tradingEnabled });
});

app.post("/mcp", requireBearerToken, async (req, res) => {
  const server = createServer(config);
  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (err) {
    console.error("Error handling MCP request:", err instanceof Error ? err.message : err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// Stateless mode doesn't use GET (server->client push) or DELETE (session
// termination) — reject explicitly.
app.get("/mcp", requireBearerToken, (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed." },
    id: null,
  });
});
app.delete("/mcp", requireBearerToken, (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed." },
    id: null,
  });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(
    `dexjup-mcp HTTP server listening on port ${PORT} (tradingEnabled=${config.tradingEnabled})`,
  );
});

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
