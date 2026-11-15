import { useEffect, useRef, useState } from "react";
import type { Wallet as BdkWallet } from "@bitcoindevkit/bdk-wallet-web";
import { QRCodeSVG } from "qrcode.react";
import {
  createBdkTestnetWallet,
  describeWalletCreationError,
  restoreBdkTestnetWallet,
} from "./bdk-testnet-wallet";
import {
  deleteEncryptedChangeset,
  loadEncryptedChangeset,
  saveEncryptedChangeset,
} from "./bdk-testnet-persistence";
import { decryptTestnetWalletBackup, encryptTestnetWalletBackup } from "./testnet-wallet-backup";

async function persistStagedWalletState(wallet: BdkWallet, seed: Uint8Array): Promise<void> {
  const staged = wallet.take_staged();
  if (!staged) throw new Error("BDK did not return the wallet changes needed for safe local recovery.");
  try {
    await saveEncryptedChangeset(staged.to_json(), seed);
  } finally {
    staged.free();
  }
}

export default function TestnetWalletPanel() {
  const walletRef = useRef<BdkWallet | null>(null);
  const walletSeedRef = useRef<Uint8Array | null>(null);
  const [address, setAddress] = useState("");
  const [backupPassword, setBackupPassword] = useState("");
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [diagnostic, setDiagnostic] = useState("");

  function clearWallet() {
    walletRef.current?.free();
    walletRef.current = null;
    walletSeedRef.current?.fill(0);
    walletSeedRef.current = null;
    setAddress("");
  }

  useEffect(() => () => {
    walletRef.current?.free();
    walletRef.current = null;
    walletSeedRef.current?.fill(0);
    walletSeedRef.current = null;
  }, []);

  async function createWallet() {
    setBusy(true);
    setStatus("");
    setDiagnostic("");
    clearWallet();

    if (!globalThis.crypto?.getRandomValues) {
      setStatus("This browser does not provide a secure random-number generator.");
      setBusy(false);
      return;
    }

    const seed = globalThis.crypto.getRandomValues(new Uint8Array(32));
    let createdWallet: BdkWallet | null = null;
    try {
      await deleteEncryptedChangeset();
      const result = await createBdkTestnetWallet(seed);
      createdWallet = result.wallet;
      await persistStagedWalletState(createdWallet, seed);
      walletRef.current = createdWallet;
      createdWallet = null;
      walletSeedRef.current = seed.slice();
      setAddress(result.address);
      setStatus("Testnet wallet created locally. Its BDK state is encrypted in this browser. Export a backup before relying on it.");
    } catch (error) {
      createdWallet?.free();
      const detail = describeWalletCreationError(error);
      console.error("KIVORA testnet wallet initialization failed:", error);
      setStatus("The testnet wallet could not be created and safely saved.");
      setDiagnostic(detail);
    } finally {
      seed.fill(0);
      setBusy(false);
    }
  }

  async function restoreWallet() {
    if (!backupFile) {
      setStatus("Choose a KIVORA wallet backup file first.");
      return;
    }
    setBusy(true);
    setStatus("");
    setDiagnostic("");
    clearWallet();

    let seed: Uint8Array | null = null;
    let restoredWallet: BdkWallet | null = null;
    try {
      const serialized = await backupFile.text();
      seed = await decryptTestnetWalletBackup(serialized, backupPassword);
      const savedChangeset = await loadEncryptedChangeset(seed);
      const result = savedChangeset
        ? await restoreBdkTestnetWallet(seed, savedChangeset)
        : await createBdkTestnetWallet(seed);
      restoredWallet = result.wallet;
      if (!savedChangeset) await persistStagedWalletState(restoredWallet, seed);
      walletRef.current = restoredWallet;
      restoredWallet = null;
      walletSeedRef.current = seed.slice();
      setAddress(result.address);
      setStatus(savedChangeset
        ? "Wallet restored with its locally saved BDK state."
        : "Seed backup restored. This browser had no saved chain state, so the first address was re-derived.");
      setBackupFile(null);
    } catch (error) {
      restoredWallet?.free();
      setStatus(error instanceof Error ? error.message : "The wallet backup could not be restored.");
    } finally {
      seed?.fill(0);
      setBusy(false);
    }
  }

  async function exportBackup() {
    const seed = walletSeedRef.current;
    if (!seed) return;
    setBusy(true);
    setStatus("");
    try {
      const serialized = await encryptTestnetWalletBackup(seed, backupPassword);
      const blob = new Blob([serialized], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "kivora-testnet-wallet-backup.json";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
      setStatus("Encrypted seed backup exported. Keep the file and password separately; KIVORA cannot recover either.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "The encrypted backup could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function copyAddress() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setStatus("Testnet address copied.");
    } catch {
      setStatus("Clipboard access is unavailable. Select and copy the address manually.");
    }
  }

  async function discardWallet() {
    setBusy(true);
    try {
      await deleteEncryptedChangeset();
      clearWallet();
      setDiagnostic("");
      setStatus("Wallet and its encrypted local state were discarded. Your exported backup file is unaffected.");
    } catch (error) {
      clearWallet();
      setStatus(error instanceof Error
        ? `Wallet cleared from memory, but local state could not be deleted: ${error.message}`
        : "Wallet cleared from memory, but local state could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace testnet-wallet">
      <div className="workspace-heading">
        <div>
          <p className="eyebrow">ON-CHAIN BITCOIN · BDK-WASM</p>
          <h2>Test the on-chain wallet</h2>
        </div>
        <span className="step-label">TESTNET ONLY</span>
      </div>
      <p className="privacy-note testnet-intro">
        This is an experimental testnet wallet. Keys and addresses are derived locally, and BDK wallet state is encrypted before local browser storage.
        It does not sync balances or send transactions. Do not use it for real BTC.
      </p>
      {!address ? (
        <>
          <button className="submit-button" type="button" onClick={() => void createWallet()} disabled={busy}>
            <span>{busy ? "Creating testnet wallet…" : "Create testnet wallet"}</span>
            <span aria-hidden="true">↗</span>
          </button>
          <div className="backup-controls">
            <p className="eyebrow">RESTORE FROM ENCRYPTED BACKUP</p>
            <label className="field">
              <span>Backup file</span>
              <input type="file" accept=".json,application/json" onChange={(event) => setBackupFile(event.target.files?.[0] ?? null)} disabled={busy} />
            </label>
            <label className="field">
              <span>Backup password</span>
              <input type="password" autoComplete="current-password" value={backupPassword} onChange={(event) => setBackupPassword(event.target.value)} placeholder="At least 12 characters" disabled={busy} />
            </label>
            <button className="unit-option" type="button" onClick={() => void restoreWallet()} disabled={busy || !backupFile || backupPassword.length < 12}>
              {busy ? "Restoring…" : "Restore testnet wallet"}
            </button>
          </div>
        </>
      ) : (
        <div className="testnet-result">
          <div className="testnet-qr">
            <QRCodeSVG value={`bitcoin:${address}`} size={220} level="M" includeMargin />
          </div>
          <p className="eyebrow testnet-address-label">BITCOIN TESTNET RECEIVE ADDRESS</p>
          <p className="testnet-address">{address}</p>
          <div className="backup-controls">
            <label className="field">
              <span>Set a strong backup password</span>
              <input type="password" autoComplete="new-password" value={backupPassword} onChange={(event) => setBackupPassword(event.target.value)} placeholder="At least 12 characters" disabled={busy} />
            </label>
            <button className="submit-button" type="button" onClick={() => void exportBackup()} disabled={busy || backupPassword.length < 12}>
              {busy ? "Preparing backup…" : "Export encrypted backup"}
            </button>
          </div>
          <div className="unit-options">
            <button className="unit-option selected" type="button" onClick={() => void copyAddress()}>Copy address</button>
            <button className="unit-option" type="button" onClick={() => void discardWallet()} disabled={busy}>Discard wallet</button>
          </div>
          <p className="privacy-note">The seed backup is encrypted locally with AES-256-GCM and PBKDF2-SHA-256. It is a KIVORA backup file, not a BIP39 recovery phrase. Keep the password separately: a lost password cannot be reset. No key material is uploaded.</p>
          <p className="privacy-note">The BDK changeset is separately encrypted in this browser using a key derived from the seed. Browser storage is not a backup; export and safely retain the encrypted seed file. This prototype still does not sync balances or send transactions. Do not send coins until clean-device recovery and QR interoperability have been verified.</p>
        </div>
      )}
      {status && <p className="notice" role="status">{status}</p>}
      {diagnostic && <p className="privacy-note" role="status">Diagnostic: {diagnostic}</p>}
    </section>
  );
}
