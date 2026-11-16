import { beforeEach, describe, expect, it } from "vitest";
import {
  decryptChangesetPayload,
  encryptChangesetPayload,
} from "../web/src/bdk-testnet-persistence";

describe("encrypted BDK changeset payload", () => {
  let seed: Uint8Array;
  let salt: Uint8Array;
  let iv: Uint8Array;

  beforeEach(() => {
    seed = new Uint8Array(32).fill(17);
    salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  });

  it("round-trips a changeset payload with the wallet seed", async () => {
    const payload = JSON.stringify({ network: "testnet", indexer: { external: 2 } });
    const ciphertext = await encryptChangesetPayload(payload, seed, salt, iv, 1);
    await expect(decryptChangesetPayload(ciphertext, seed, salt, iv, 1)).resolves.toBe(payload);
  });

  it("supports a 64-byte BIP39-derived seed", async () => {
    const bip39Seed = new Uint8Array(64).fill(23);
    const ciphertext = await encryptChangesetPayload("BIP39 wallet metadata", bip39Seed, salt, iv, 1);
    await expect(decryptChangesetPayload(ciphertext, bip39Seed, salt, iv, 1)).resolves.toBe("BIP39 wallet metadata");
  });

  it("rejects a different seed", async () => {
    const ciphertext = await encryptChangesetPayload("private wallet metadata", seed, salt, iv, 1);
    const wrongSeed = new Uint8Array(32).fill(18);
    await expect(decryptChangesetPayload(ciphertext, wrongSeed, salt, iv, 1)).rejects.toThrow();
  });

  it("rejects ciphertext tampering", async () => {
    const ciphertext = await encryptChangesetPayload("private wallet metadata", seed, salt, iv, 1);
    const tampered = ciphertext.slice(0);
    new Uint8Array(tampered)[0] ^= 1;
    await expect(decryptChangesetPayload(tampered, seed, salt, iv, 1)).rejects.toThrow();
  });

  it("authenticates the stored revision", async () => {
    const ciphertext = await encryptChangesetPayload("private wallet metadata", seed, salt, iv, 1);
    await expect(decryptChangesetPayload(ciphertext, seed, salt, iv, 2)).rejects.toThrow();
  });

  it("rejects unsupported seed lengths", async () => {
    await expect(
      encryptChangesetPayload("state", new Uint8Array(31), salt, iv, 1),
    ).rejects.toThrow("seed is invalid");
  });
});
