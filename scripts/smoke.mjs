import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
});

const client = new Client({ name: "smoke-test", version: "0.1.0" });
await client.connect(transport);

const tools = await client.listTools();
console.log("TOOL NAMES:", tools.tools.map((t) => t.name).join(", "));

const ping = await client.callTool({ name: "ping", arguments: {} });
console.log("PING:", ping.content[0].text);

const search = await client.callTool({ name: "search_pairs", arguments: { query: "SOL/USDC" } });
const searchParsed = JSON.parse(search.content[0].text);
console.log("SEARCH_PAIRS: source=%s pairs=%d", searchParsed.source, searchParsed.pairs.length);

const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const tokenPairs = await client.callTool({
  name: "get_token_pairs",
  arguments: { tokenAddress: USDC, chainId: "solana" },
});
const tpParsed = JSON.parse(tokenPairs.content[0].text);
console.log("GET_TOKEN_PAIRS: source=%s pairs=%d topVol24h=%s", tpParsed.source, tpParsed.pairs.length, tpParsed.pairs[0]?.volume?.h24);

const firstPairAddr = tpParsed.pairs[0]?.pairAddress;
const pair = await client.callTool({
  name: "get_pair",
  arguments: { chainId: "solana", pairId: firstPairAddr },
});
const pairParsed = JSON.parse(pair.content[0].text);
console.log("GET_PAIR: source=%s pairAddress=%s", pairParsed.source, pairParsed.pair?.pairAddress);

const batch = await client.callTool({
  name: "get_tokens",
  arguments: { tokenAddresses: [USDC], chainId: "solana" },
});
const batchParsed = JSON.parse(batch.content[0].text);
console.log("GET_TOKENS: source=%s pairs=%d", batchParsed.source, batchParsed.pairs.length);

const profiles = await client.callTool({ name: "get_token_profiles", arguments: { chainFilter: "solana" } });
const profilesParsed = JSON.parse(profiles.content[0].text);
console.log("GET_TOKEN_PROFILES: source=%s profiles=%d", profilesParsed.source, profilesParsed.profiles.length);

// Error path check: invalid chain/pair should come back as isError, not throw.
const badPair = await client.callTool({ name: "get_pair", arguments: { chainId: "solana", pairId: "not-a-real-pair" } });
console.log("GET_PAIR (bad input) isError=%s", badPair.isError);

const SOL = "So11111111111111111111111111111111111111112";
const quote = await client.callTool({
  name: "get_jupiter_quote",
  arguments: { inputMint: SOL, outputMint: USDC, amount: 1000000000, slippageBps: 100 },
});
const quoteParsed = JSON.parse(quote.content[0].text);
console.log("GET_JUPITER_QUOTE: source=%s outAmount=%s priceImpact=%s", quoteParsed.source, quoteParsed.quote?.outAmount, quoteParsed.quote?.priceImpactPct);

const badQuote = await client.callTool({
  name: "get_jupiter_quote",
  arguments: { inputMint: SOL, outputMint: "J2DG1CD9TZRCY8zY2Jruoed4dRaahH9fJuHC8pgkm4hQ", amount: 1000000000 },
});
const badQuoteParsed = JSON.parse(badQuote.content[0].text);
console.log("GET_JUPITER_QUOTE (no route): quote=%s errorCode=%s isError=%s", badQuoteParsed.quote, badQuoteParsed.errorCode, badQuote.isError);

const overview = await client.callTool({ name: "get_token_overview", arguments: { tokenAddress: USDC, chainId: "solana" } });
const overviewParsed = JSON.parse(overview.content[0].text);
console.log(
  "GET_TOKEN_OVERVIEW (USDC): poolCount=%d bestPairVol24h=%s jupiterSource=%s jupiterOutAmount=%s",
  overviewParsed.dexscreener.poolCount,
  overviewParsed.dexscreener.bestPair?.volume?.h24,
  overviewParsed.jupiter.source,
  overviewParsed.jupiter.quote?.outAmount,
);

// Deliberate partial-failure path: token has no DEX Screener listing and no Jupiter route.
const fakeMint = "J2DG1CD9TZRCY8zY2Jruoed4dRaahH9fJuHC8pgkm4hQ";
const overviewBad = await client.callTool({ name: "get_token_overview", arguments: { tokenAddress: fakeMint, chainId: "solana" } });
const overviewBadParsed = JSON.parse(overviewBad.content[0].text);
console.log(
  "GET_TOKEN_OVERVIEW (fake mint, partial failure): isError=%s poolCount=%d bestPair=%s jupiterError=%s",
  overviewBad.isError,
  overviewBadParsed.dexscreener.poolCount,
  overviewBadParsed.dexscreener.bestPair,
  overviewBadParsed.jupiter.error,
);

const balance = await client.callTool({
  name: "get_wallet_balance",
  arguments: { walletAddress: "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1" },
});
const balanceParsed = JSON.parse(balance.content[0].text);
console.log("GET_WALLET_BALANCE: address=%s solBalance=%s", balanceParsed.address, balanceParsed.solBalance);

const noWallet = await client.callTool({ name: "get_wallet_balance", arguments: {} });
console.log("GET_WALLET_BALANCE (no address, trading disabled): isError=%s", noWallet.isError);

const swapStatus = await client.callTool({
  name: "get_swap_status",
  arguments: { signature: "5RPghQVCE8Sbv9hXrJQ1gABvQkzE9q6voKk4U72bEYNL22n2UZbaW9rWAheuUurouCgdUERjPYftTL5xs4utLypX" },
});
const swapStatusParsed = JSON.parse(swapStatus.content[0].text);
console.log("GET_SWAP_STATUS (well-formed but nonexistent sig): found=%s isError=%s", swapStatusParsed.found, swapStatus.isError);

const swapStatusMalformed = await client.callTool({ name: "get_swap_status", arguments: { signature: "not-valid" } });
console.log("GET_SWAP_STATUS (malformed sig): isError=%s", swapStatusMalformed.isError);

const execAttempt = await client.callTool({
  name: "execute_swap",
  arguments: {
    quote: { inputMint: SOL, outputMint: USDC, inAmount: "1000000000", outAmount: "73000000", slippageBps: 50 },
    quoteFetchedAt: new Date().toISOString(),
    confirm: true,
  },
});
const execParsed = JSON.parse(execAttempt.content[0].text);
console.log(
  "EXECUTE_SWAP (trading disabled): isError=%s code=%s",
  execAttempt.isError,
  execParsed.code,
);

await client.close();
process.exit(0);
