import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

let cachedKeypair: Keypair | null = null;
let cachedPublicKey: string | null = null;

/**
 * Parses a private key string in either JSON byte-array form (e.g. "[12,34,...]")
 * or base58 string form. Never logs the input. Throws a generic error on
 * malformed input rather than leaking parser internals.
 */
export function parsePrivateKey(raw: string): Keypair {
  const trimmed = raw.trim();
  try {
    if (trimmed.startsWith("[")) {
      const parsed: unknown = JSON.parse(trimmed);
      if (!Array.isArray(parsed) || !parsed.every((n) => typeof n === "number")) {
        throw new Error("not a numeric array");
      }
      return Keypair.fromSecretKey(Uint8Array.from(parsed));
    }
    return Keypair.fromSecretKey(bs58.decode(trimmed));
  } catch {
    throw new Error(
      "SOLANA_PRIVATE_KEY is malformed: expected a base58-encoded secret key or a JSON byte-array string.",
    );
  }
}

/**
 * Loads the signing keypair from the given raw key material, caching it
 * module-scoped so parsing happens exactly once per process. Callers should
 * never hold onto `raw` themselves after calling this.
 */
export function loadKeypair(raw: string): Keypair {
  if (!cachedKeypair) {
    cachedKeypair = parsePrivateKey(raw);
    cachedPublicKey = cachedKeypair.publicKey.toBase58();
  }
  return cachedKeypair;
}

export function getCachedPublicKey(): string | null {
  return cachedPublicKey;
}

/** Test-only: clears the module-scoped cache between test cases. */
export function __resetKeypairCacheForTests(): void {
  cachedKeypair = null;
  cachedPublicKey = null;
}
