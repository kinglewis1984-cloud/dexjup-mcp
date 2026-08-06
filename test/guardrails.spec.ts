import { describe, expect, it } from "vitest";
import { assertSwapAllowed, GuardrailError, SOL_MINT, type GuardrailConfig, type SwapGuardrailInput } from "../src/wallet/guardrails.js";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

const baseConfig: GuardrailConfig = {
  maxSolPerSwap: 0.5,
  maxSlippageBps: 500,
  quoteFreshnessSeconds: 30,
};

const now = 1_000_000;

function baseInput(overrides: Partial<SwapGuardrailInput> = {}): SwapGuardrailInput {
  return {
    tradingEnabled: true,
    confirm: true,
    inputMint: SOL_MINT,
    outputMint: USDC_MINT,
    amount: 0.1 * 1_000_000_000, // 0.1 SOL in lamports
    slippageBps: 100,
    quoteFetchedAt: now - 5_000,
    now,
    ...overrides,
  };
}

describe("assertSwapAllowed", () => {
  it("allows a valid swap through every check", () => {
    expect(() => assertSwapAllowed(baseInput(), baseConfig)).not.toThrow();
  });

  it("rejects when trading is disabled", () => {
    expect(() => assertSwapAllowed(baseInput({ tradingEnabled: false }), baseConfig)).toThrow(
      GuardrailError,
    );
    try {
      assertSwapAllowed(baseInput({ tradingEnabled: false }), baseConfig);
    } catch (e) {
      expect((e as GuardrailError).code).toBe("TRADING_DISABLED");
    }
  });

  it("rejects when confirm is not exactly true", () => {
    expect(() => assertSwapAllowed(baseInput({ confirm: false }), baseConfig)).toThrow(
      /confirm/i,
    );
  });

  it("rejects when the input mint is denied", () => {
    const config: GuardrailConfig = { ...baseConfig, denyMints: [SOL_MINT] };
    try {
      assertSwapAllowed(baseInput(), config);
      throw new Error("expected to throw");
    } catch (e) {
      expect((e as GuardrailError).code).toBe("MINT_DENIED");
    }
  });

  it("rejects when the output mint is not in the allow-list", () => {
    const config: GuardrailConfig = { ...baseConfig, allowedOutputMints: ["SomeOtherMint111111111111111111111111111"] };
    try {
      assertSwapAllowed(baseInput(), config);
      throw new Error("expected to throw");
    } catch (e) {
      expect((e as GuardrailError).code).toBe("MINT_NOT_ALLOWED");
    }
  });

  it("rejects a SOL amount over the per-swap cap", () => {
    try {
      assertSwapAllowed(baseInput({ amount: 1 * 1_000_000_000 }), baseConfig);
      throw new Error("expected to throw");
    } catch (e) {
      expect((e as GuardrailError).code).toBe("AMOUNT_EXCEEDS_CAP");
    }
  });

  it("does not apply the SOL cap to non-SOL input mints", () => {
    expect(() =>
      assertSwapAllowed(
        baseInput({ inputMint: USDC_MINT, outputMint: SOL_MINT, amount: 10_000 * 1_000_000 }),
        baseConfig,
      ),
    ).not.toThrow();
  });

  it("rejects slippage over the configured cap", () => {
    try {
      assertSwapAllowed(baseInput({ slippageBps: 1000 }), baseConfig);
      throw new Error("expected to throw");
    } catch (e) {
      expect((e as GuardrailError).code).toBe("SLIPPAGE_EXCEEDS_CAP");
    }
  });

  it("rejects a stale quote", () => {
    try {
      assertSwapAllowed(baseInput({ quoteFetchedAt: now - 60_000 }), baseConfig);
      throw new Error("expected to throw");
    } catch (e) {
      expect((e as GuardrailError).code).toBe("QUOTE_STALE");
    }
  });

  it("checks trading-enabled before confirm before caps (fail on first violation)", () => {
    try {
      assertSwapAllowed(baseInput({ tradingEnabled: false, confirm: false, slippageBps: 9999 }), baseConfig);
      throw new Error("expected to throw");
    } catch (e) {
      expect((e as GuardrailError).code).toBe("TRADING_DISABLED");
    }
  });
});
