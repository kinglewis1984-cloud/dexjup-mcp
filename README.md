# dexjup-mcp

An MCP (Model Context Protocol) server combining [DEX Screener](https://dexscreener.com)
market data with [Jupiter](https://jup.ag) (Solana DEX aggregator) quotes and
gated swap execution — in one server.

Most existing MCP servers in this space do one or the other: pure
DEX Screener reads with no execution, or Jupiter execution with no read-only
mode and no safety guardrails. This server does both, with execution locked
behind explicit opt-in, hard caps, and a confirm flag — see
[SECURITY.md](./SECURITY.md) before enabling trading.

## Safety model (read this first if you plan to enable trading)

By default this server is **read-only**. `execute_swap` is listed but
refuses to run unless you explicitly set `TRADING_ENABLED=true`, and even
then every call is checked against server-side caps on swap size, slippage,
and quote age before anything is signed. Full detail in
[SECURITY.md](./SECURITY.md).

## Install / configure

Add to your MCP client config (e.g. Claude Desktop's `claude_desktop_config.json`
or Claude Code's MCP settings):

```json
{
  "mcpServers": {
    "dexjup": {
      "command": "npx",
      "args": ["-y", "dexjup-mcp"],
      "env": {
        "RPC_URL": "https://api.mainnet-beta.solana.com"
      }
    }
  }
}
```

That's enough for all read-only tools. See [.env.example](./.env.example)
for every setting, and [SECURITY.md](./SECURITY.md) before adding
`TRADING_ENABLED` / `SOLANA_PRIVATE_KEY`.

## Tools

**Read-only** (no wallet required):

| Tool | What it does |
|---|---|
| `search_pairs` | Search DEX Screener pairs by free text |
| `get_token_pairs` | All pools for a token, sorted by 24h volume |
| `get_pair` | Detail for one specific pair by address |
| `get_tokens` | Batch lookup for up to 30 tokens in one call |
| `get_token_profiles` | Trending/boosted token profiles |
| `get_jupiter_quote` | Live Jupiter swap quote — no wallet, no execution |
| `get_wallet_balance` | SOL + SPL balance for any address |
| `get_swap_status` | Confirmation status of a transaction signature |

**Aggregation:**

| Tool | What it does |
|---|---|
| `get_token_overview` | Merges DEX Screener market data with a live Jupiter reference quote for one token; degrades gracefully if either source has nothing |

**Write** (gated — see [SECURITY.md](./SECURITY.md)):

| Tool | What it does |
|---|---|
| `execute_swap` | Executes a real on-chain swap against a previously-fetched quote |

## Development

```bash
npm install
npm run build
npm run inspector   # opens MCP Inspector against the built server
npm test            # unit tests, no network/funds required
```

## License

MIT
