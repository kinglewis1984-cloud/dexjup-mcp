import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

function env(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { ...overrides };
}

describe("loadConfig", () => {
  it("applies sane defaults with no env vars set", () => {
    const cfg = loadConfig(env());
    expect(cfg.tradingEnabled).toBe(false);
    expect(cfg.solanaPrivateKey).toBeUndefined();
    expect(cfg.maxSolPerSwap).toBe(0.5);
    expect(cfg.maxSlippageBps).toBe(500);
  });

  it("does not require SOLANA_PRIVATE_KEY when trading is disabled", () => {
    expect(() => loadConfig(env({ TRADING_ENABLED: "false" }))).not.toThrow();
  });

  it("fails fast when TRADING_ENABLED=true but no key is provided", () => {
    expect(() => loadConfig(env({ TRADING_ENABLED: "true" }))).toThrow(/SOLANA_PRIVATE_KEY/);
  });

  it("succeeds when TRADING_ENABLED=true and a key is provided", () => {
    const cfg = loadConfig(env({ TRADING_ENABLED: "true", SOLANA_PRIVATE_KEY: "some-key-material" }));
    expect(cfg.tradingEnabled).toBe(true);
    expect(cfg.solanaPrivateKey).toBe("some-key-material");
  });

  it("omits the private key from the returned config when trading is disabled, even if the env var is set", () => {
    const cfg = loadConfig(env({ TRADING_ENABLED: "false", SOLANA_PRIVATE_KEY: "leftover-key" }));
    expect(cfg.solanaPrivateKey).toBeUndefined();
  });

  it("rejects a malformed RPC_URL", () => {
    expect(() => loadConfig(env({ RPC_URL: "not-a-url" }))).toThrow(/Invalid environment configuration/);
  });

  it("parses comma-separated mint lists", () => {
    const cfg = loadConfig(env({ ALLOWED_OUTPUT_MINTS: "mintA, mintB ,mintC" }));
    expect(cfg.allowedOutputMints).toEqual(["mintA", "mintB", "mintC"]);
  });
});
