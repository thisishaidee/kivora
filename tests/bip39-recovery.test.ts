import { describe, expect, it } from "vitest";
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

  it("rejects invalid word counts and invalid BIP39 checksums", () => {
    expect(validateRecoveryPhrase("abandon abandon abandon")).toBe(false);
    expect(validateRecoveryPhrase("abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon")).toBe(false);
  });
});
