import { generateMnemonic, mnemonicToSeed, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";

export const BIP39_WORD_COUNT = 12;

/** Generate a standard 128-bit-entropy, 12-word English BIP39 recovery phrase. */
export function createRecoveryPhrase(): string {
  return generateMnemonic(wordlist, 128);
}

/** Validate checksum and wordlist membership, and enforce KIVORA's 12-word policy. */
export function validateRecoveryPhrase(phrase: string): boolean {
  const normalized = phrase.normalize("NFKD").trim().toLowerCase().split(/\s+/).join(" ");
  return normalized.split(" ").length === BIP39_WORD_COUNT && validateMnemonic(normalized, wordlist);
}

/** Derive the standard 64-byte BIP39 seed locally. KIVORA uses the empty optional passphrase. */
export async function recoveryPhraseToSeed(phrase: string): Promise<Uint8Array> {
  const normalized = phrase.normalize("NFKD").trim().toLowerCase().split(/\s+/).join(" ");
  if (!validateRecoveryPhrase(normalized)) {
    throw new Error("Enter a valid 12-word English recovery phrase, in the correct order.");
  }
  return mnemonicToSeed(normalized, "");
}
