import { beforeAll, describe, expect, it } from "vitest";
import { decryptTestnetWalletBackup, encryptTestnetWalletBackup } from "../web/src/testnet-wallet-backup";

const password = "correct horse battery staple";
const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);

beforeAll(() => {
  if (!globalThis.crypto?.subtle) throw new Error("WebCrypto is required for these tests.");
});

describe("encrypted testnet wallet backup", () => {
  it("round-trips the 32-byte derivation seed", async () => {
    const backup = await encryptTestnetWalletBackup(seed, password);
    const restored = await decryptTestnetWalletBackup(backup, password);
    expect(Array.from(restored)).toEqual(Array.from(seed));
  });

  it("uses a fresh salt and IV for each backup", async () => {
    const first = JSON.parse(await encryptTestnetWalletBackup(seed, password));
    const second = JSON.parse(await encryptTestnetWalletBackup(seed, password));
    expect(first.kdf.salt).not.toBe(second.kdf.salt);
    expect(first.cipher.iv).not.toBe(second.cipher.iv);
    expect(first.cipher.ciphertext).not.toBe(second.cipher.ciphertext);
  });

  it("rejects a wrong password", async () => {
    const backup = await encryptTestnetWalletBackup(seed, password);
    await expect(decryptTestnetWalletBackup(backup, "a different password")).rejects.toThrow("could not be unlocked");
  });

  it("rejects malformed and unsupported backup files", async () => {
    await expect(decryptTestnetWalletBackup("not json", password)).rejects.toThrow("not a valid");
    const backup = JSON.parse(await encryptTestnetWalletBackup(seed, password));
    backup.network = "bitcoin";
    await expect(decryptTestnetWalletBackup(JSON.stringify(backup), password)).rejects.toThrow("Unsupported");
  });

  it("rejects weak passwords and non-32-byte seeds", async () => {
    await expect(encryptTestnetWalletBackup(seed, "short")).rejects.toThrow("at least 12");
    await expect(encryptTestnetWalletBackup(new Uint8Array(16), password)).rejects.toThrow("32-byte");
  });
});
