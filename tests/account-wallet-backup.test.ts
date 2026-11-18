import { beforeEach, describe, expect, it } from "vitest";
import {
  decryptAccountWalletBackup,
  encryptAccountWalletBackup,
} from "../web/src/account-wallet-backup";

const accountA = "11111111-1111-4111-8111-111111111111";
const accountB = "22222222-2222-4222-8222-222222222222";
const password = "correct horse battery staple";

describe("account-linked wallet backup encryption", () => {
  beforeEach(() => {
    if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is required for wallet backup tests.");
  });

  it("round-trips a serialized BDK backup for its owning account", async () => {
    const serialized = JSON.stringify({ descriptor: "testnet-descriptor", changeset: { version: 1 } });
    const encrypted = await encryptAccountWalletBackup(serialized, password, accountA);
    expect(encrypted.ciphertext).not.toContain("testnet-descriptor");
    await expect(decryptAccountWalletBackup(encrypted, password, accountA)).resolves.toBe(serialized);
  });

  it("rejects a wrong account password", async () => {
    const encrypted = await encryptAccountWalletBackup("wallet-state", password, accountA);
    await expect(decryptAccountWalletBackup(encrypted, "a different secure password", accountA))
      .rejects.toThrow(/could not unlock/i);
  });

  it("binds ciphertext to the account identity", async () => {
    const encrypted = await encryptAccountWalletBackup("wallet-state", password, accountA);
    await expect(decryptAccountWalletBackup(encrypted, password, accountB))
      .rejects.toThrow(/could not unlock/i);
  });

  it("rejects tampered ciphertext", async () => {
    const encrypted = await encryptAccountWalletBackup("wallet-state", password, accountA);
    const altered = { ...encrypted, ciphertext: encrypted.ciphertext.slice(0, -4) + "AAAA" };
    await expect(decryptAccountWalletBackup(altered, password, accountA))
      .rejects.toThrow(/could not unlock|malformed/i);
  });

  it("rejects unsupported or excessive KDF parameters before derivation", async () => {
    const encrypted = await encryptAccountWalletBackup("wallet-state", password, accountA);
    await expect(decryptAccountWalletBackup({ ...encrypted, iterations: 1 }, password, accountA))
      .rejects.toThrow(/not supported/i);
    await expect(decryptAccountWalletBackup({ ...encrypted, iterations: 9_999_999 }, password, accountA))
      .rejects.toThrow(/not supported/i);
  });

  it("rejects malformed salt and IV lengths", async () => {
    const encrypted = await encryptAccountWalletBackup("wallet-state", password, accountA);
    await expect(decryptAccountWalletBackup({ ...encrypted, salt: "AQ==" }, password, accountA))
      .rejects.toThrow(/malformed/i);
    await expect(decryptAccountWalletBackup({ ...encrypted, iv: "AQ==" }, password, accountA))
      .rejects.toThrow(/malformed/i);
  });
});
