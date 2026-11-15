import { beforeAll, describe, expect, it } from "vitest";
import {
  decryptTestnetWalletBackup,
  encryptTestnetWalletBackup,
  encryptTestnetWalletBackupV2,
} from "../web/src/testnet-wallet-backup";

const password = "correct horse battery staple";
const seed = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const changeset = JSON.stringify({
  network: "testnet",
  descriptors: { external: "wpkh([abcd/84'/1'/0']xpub.../0/*)" },
  last_revealed: { external: 3 },
});

beforeAll(() => {
  if (!globalThis.crypto?.subtle) throw new Error("WebCrypto is required for these tests.");
});

describe("encrypted testnet wallet backup", () => {
  it("round-trips the original v1 seed-only backup format", async () => {
    const backup = await encryptTestnetWalletBackup(seed, password);
    const parsed = JSON.parse(backup);
    expect(parsed.version).toBe(1);
    const restored = await decryptTestnetWalletBackup(backup, password);
    expect(restored.version).toBe(1);
    expect(restored.changesetJson).toBeNull();
    expect(Array.from(restored.seed)).toEqual(Array.from(seed));
  });

  it("round-trips v2 seed and BDK changeset state", async () => {
    const backup = await encryptTestnetWalletBackupV2(seed, changeset, password);
    const parsed = JSON.parse(backup);
    expect(parsed.version).toBe(2);
    expect(parsed.descriptorPolicy).toBe("bip84-p2wpkh");
    const restored = await decryptTestnetWalletBackup(backup, password);
    expect(restored.version).toBe(2);
    expect(Array.from(restored.seed)).toEqual(Array.from(seed));
    expect(restored.changesetJson).toBe(changeset);
  });

  it("uses a fresh salt and IV for each v2 backup", async () => {
    const first = JSON.parse(await encryptTestnetWalletBackupV2(seed, changeset, password));
    const second = JSON.parse(await encryptTestnetWalletBackupV2(seed, changeset, password));
    expect(first.kdf.salt).not.toBe(second.kdf.salt);
    expect(first.cipher.iv).not.toBe(second.cipher.iv);
    expect(first.cipher.ciphertext).not.toBe(second.cipher.ciphertext);
  });

  it("rejects a wrong password for v2", async () => {
    const backup = await encryptTestnetWalletBackupV2(seed, changeset, password);
    await expect(decryptTestnetWalletBackup(backup, "a different password")).rejects.toThrow("could not be unlocked");
  });

  it("rejects malformed, unsupported and wrong-network backups", async () => {
    await expect(decryptTestnetWalletBackup("not json", password)).rejects.toThrow("not a valid");
    const backup = JSON.parse(await encryptTestnetWalletBackupV2(seed, changeset, password));
    backup.network = "bitcoin";
    await expect(decryptTestnetWalletBackup(JSON.stringify(backup), password)).rejects.toThrow("Unsupported");
  });

  it("rejects unsupported v2 descriptor policies and SDK versions", async () => {
    const backup = JSON.parse(await encryptTestnetWalletBackupV2(seed, changeset, password));
    backup.sdkVersion = "0.5.0";
    await expect(decryptTestnetWalletBackup(JSON.stringify(backup), password)).rejects.toThrow("descriptor policy or BDK version");
  });

  it("rejects weak passwords, non-32-byte seeds and invalid changesets", async () => {
    await expect(encryptTestnetWalletBackup(seed, "short")).rejects.toThrow("at least 12");
    await expect(encryptTestnetWalletBackupV2(new Uint8Array(16), changeset, password)).rejects.toThrow("32-byte");
    await expect(encryptTestnetWalletBackupV2(seed, "not json", password)).rejects.toThrow("not valid JSON");
  });
});
