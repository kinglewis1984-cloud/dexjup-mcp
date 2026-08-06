import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { beforeEach, describe, expect, it } from "vitest";
import { __resetKeypairCacheForTests, loadKeypair, parsePrivateKey } from "../src/wallet/keypair.js";

describe("parsePrivateKey", () => {
  it("round-trips a base58-encoded secret key", () => {
    const kp = Keypair.generate();
    const encoded = bs58.encode(kp.secretKey);
    const parsed = parsePrivateKey(encoded);
    expect(parsed.publicKey.toBase58()).toBe(kp.publicKey.toBase58());
  });

  it("round-trips a JSON byte-array secret key", () => {
    const kp = Keypair.generate();
    const encoded = JSON.stringify(Array.from(kp.secretKey));
    const parsed = parsePrivateKey(encoded);
    expect(parsed.publicKey.toBase58()).toBe(kp.publicKey.toBase58());
  });

  it("throws a clear error on malformed base58 input", () => {
    expect(() => parsePrivateKey("not-a-valid-key")).toThrow(/malformed/i);
  });

  it("throws a clear error on malformed JSON array input", () => {
    expect(() => parsePrivateKey("[1,2,\"oops\"]")).toThrow(/malformed/i);
  });
});

describe("loadKeypair caching", () => {
  beforeEach(() => {
    __resetKeypairCacheForTests();
  });

  it("caches the parsed keypair across calls", () => {
    const kp = Keypair.generate();
    const encoded = bs58.encode(kp.secretKey);
    const first = loadKeypair(encoded);
    const second = loadKeypair("garbage that would throw if reparsed");
    expect(second).toBe(first);
    expect(second.publicKey.toBase58()).toBe(kp.publicKey.toBase58());
  });
});
