# Security model

## What this server does with your private key

If `TRADING_ENABLED=true`, `dexjup-mcp` reads `SOLANA_PRIVATE_KEY` from the
environment **once**, parses it into an in-memory keypair, and uses it only
to sign swap transactions built by Jupiter's API. The key:

- Is never transmitted anywhere. It signs transactions locally; only the
  signed transaction bytes are sent to your configured Solana RPC endpoint.
- Is never logged, printed, or included in any tool result.
- Is never written to disk by this project's own code (no session cache, no
  state file).
- Is not read at all if `TRADING_ENABLED` is unset or `false` — read-only
  tools (search, quotes, balances, overviews) never touch it.

Anthropic/Claude does not see your key. MCP tool calls only carry the
parameters and results shown in the conversation, not server internals or
environment variables.

## Threat model

This is a **locally-run, single-user tool**. It assumes the process runs on
your own machine, under your own OS account, launched by an MCP client (e.g.
Claude Desktop or Claude Code) that you already trust with shell access. It
is **not** designed to defend against a remote attacker with access to the
host, or to be run multi-tenant. If that's your threat model, this tool is
not sufficient on its own.

## Guardrails on `execute_swap`

Defense in depth, all enforced server-side regardless of what a caller (LLM
or otherwise) requests:

1. `TRADING_ENABLED=true` — process-level opt-in; off by default.
2. `confirm: true` — required literal parameter on every call.
3. `MAX_SOL_PER_SWAP` — hard cap on SOL-denominated swap size (default 0.5).
4. `MAX_SLIPPAGE_BPS` — hard cap on slippage tolerance (default 500 bps).
5. Quote freshness check — rejects execution against a quote older than
   `QUOTE_FRESHNESS_SECONDS` (default 30s).
6. Optional `ALLOWED_OUTPUT_MINTS` / `DENY_MINTS` scoping.
7. `execute_swap` requires a real quote object from a prior `get_jupiter_quote`
   call — it cannot execute against an amount/price an LLM invents.

## Recommendations

- Use a wallet with limited funds dedicated to this tool, not your main
  wallet.
- Set `MAX_SOL_PER_SWAP` to the smallest value that's useful to you.
- Treat this as beta software.

## Intentionally out of scope for v1

Not built, not silently missing — considered and deferred:

- OS keychain integration for the private key.
- Hardware wallet (Ledger, etc.) support.
- Multi-signature / approval workflows.
- Encryption at rest for key material.

These are reasonable v2 candidates if there's demand, but would add real
setup friction for a threat model (remote/multi-tenant attacker) that
doesn't match how this tool is actually run.

## Reporting a vulnerability

Open a GitHub issue, or if it's sensitive, contact the maintainer directly
before disclosing publicly.
