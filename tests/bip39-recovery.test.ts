import { describe, expect, it } from "vitest";
import { mnemonicToSeed } from "@scure/bip39";
import { createRecoveryPhrase, recoveryPhraseToSeed, validateRecoveryPhrase } from "../web/src/bip39-recovery";

describe("KIVORA 12-word BIP39 recovery", () => {
  it("generates a valid 12-word English BIP39 phrase", () => {
    const phrase = createRecoveryPhrase();
    expect(phrase.split(" ")).toHaveLength(12);
    expect(validateRecoveryPhrase(phrase)).toBe(true);
  });

  it("derives the same 64-byte seed from the same phrase", async () => {
    const phrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const first = await recoveryPhraseToSeed(phrase);
    const second = await recoveryPhraseToSeed(phrase);
    expect(first).toHaveLength(64);
    expect(Array.from(first)).toEqual(Array.from(second));
    first.fill(0);
    second.fill(0);
  });

  it("matches the published BIP39 PBKDF2 test vector", async () => {
    const phrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
    const seed = await mnemonicToSeed(phrase, "TREZOR");
    const hex = Array.from(seed, (byte) => byte.toString(16).padStart(2, "0")).join("");
    expect(hex).toBe("c55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04");
    seed.fill(0);
  });

  it("rejects invalid word counts and invalid BIP39 checksums", () => {
    expect(validateRecoveryPhrase("abandon abandon abandon")).toBe(false);
    expect(validateRecoveryPhrase("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon")).toBe(false);
  });
});
