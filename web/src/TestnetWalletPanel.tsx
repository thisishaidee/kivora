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
  hasEncryptedChangeset,
  loadEncryptedChangeset,
  saveEncryptedChangeset,
} from "./bdk-testnet-persistence";
import { createRecoveryPhrase, recoveryPhraseToSeed } from "./bip39-recovery";
import { fetchTestnetAddressSnapshot, formatSats, type AddressSnapshot } from "./testnet-esplora";
import { decryptAccountWalletBackup, encryptAccountWalletBackup, rememberAccountWalletUnlockKey, type EncryptedAccountWalletBackup } from "./account-wallet-backup";

async function persistStagedWalletState(wallet: BdkWallet, seed: Uint8Array): Promise<string> {
  const staged = wallet.take_staged();
  if (!staged) throw new Error("BDK did not return the wallet changes needed for safe local recovery.");
  try {
    const delta = staged.to_json();
    await saveEncryptedChangeset(delta, seed);
    return await loadEncryptedChangeset(seed) ?? delta;
  } finally {
    staged.free();
  }
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function hexToBytes(value: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value) || value.length > 128) throw new Error("The account wallet backup seed is invalid.");
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}
async function accountBackupRequest<T>(method: "GET" | "PUT", body?: unknown): Promise<T> {
  const response = await fetch("/api/wallet/backup", {
    method, credentials: "same-origin",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "The account wallet backup could not be reached.");
  return result;
}

export default function TestnetWalletPanel(props: { accountWorkerId?: string; accountPassword?: string; onWalletPasswordConsumed?: () => void }) {
  const walletRef = useRef<BdkWallet | null>(null);
  const walletSeedRef = useRef<Uint8Array | null>(null);
  const [address, setAddress] = useState("");
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [recoveryInput, setRecoveryInput] = useState("");
  const [verificationWords, setVerificationWords] = useState(["", "", ""]);
  const [showPhrase, setShowPhrase] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [diagnostic, setDiagnostic] = useState("");
  const [snapshot, setSnapshot] = useState<AddressSnapshot | null>(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [backupPassword, setBackupPassword] = useState(props.accountPassword ?? "");
  const [accountBackupState, setAccountBackupState] = useState<"checking" | "missing" | "ready" | "error">("checking");
  const [accountBackupMessage, setAccountBackupMessage] = useState("");
  const [accountBackupRevision, setAccountBackupRevision] = useState<number | null>(null);
  const [localWalletDetected, setLocalWalletDetected] = useState(false);
  const [localWalletCheckComplete, setLocalWalletCheckComplete] = useState(false);
  const pendingAccountBackupRef = useRef<string | null>(null);
  const accountBackupExistsRef = useRef(false);

  const phraseWords = recoveryPhrase ? recoveryPhrase.split(" ") : [];

  useEffect(() => {
    if (props.accountPassword) setBackupPassword(props.accountPassword);
  }, [props.accountPassword]);

  useEffect(() => {
    if (!props.accountWorkerId) {
      setAccountBackupState("missing");
      void hasEncryptedChangeset().then((exists) => {
        setLocalWalletDetected(exists);
        setLocalWalletCheckComplete(true);
      }).catch(() => setLocalWalletCheckComplete(true));
      return;
    }
    let cancelled = false;
    setAccountBackupState("checking");
    void accountBackupRequest<{ backup: (EncryptedAccountWalletBackup & { revision: number }) | null }>("GET")
      .then(async ({ backup }) => {
        if (cancelled) return;
        if (!backup) {
          accountBackupExistsRef.current = false;
          setAccountBackupRevision(null);
          setAccountBackupState("missing");
          const localExists = await hasEncryptedChangeset();
          if (!cancelled) setLocalWalletDetected(localExists);
          if (props.accountPassword) props.onWalletPasswordConsumed?.();
          return;
        }
        accountBackupExistsRef.current = true;
        setAccountBackupRevision(backup.revision);
        const serialized = await decryptAccountWalletBackup(backup, props.accountPassword || null, props.accountWorkerId!);
        const parsed = JSON.parse(serialized) as { seedHex?: string; changeset?: string };
        if (!parsed.seedHex || !parsed.changeset) throw new Error("The account wallet backup is incomplete.");
        const seed = hexToBytes(parsed.seedHex);
        let restored: BdkWallet | null = null;
        try {
          const result = await restoreBdkTestnetWallet(seed, parsed.changeset);
          restored = result.wallet;
          if (cancelled) { restored.free(); restored = null; seed.fill(0); return; }
          walletRef.current = restored;
          restored = null;
          walletSeedRef.current = seed.slice();
          setAddress(result.address);
          setAccountBackupState("ready");
          setAccountBackupMessage("Your account wallet was unlocked. Its encrypted backup is linked to this KIVORA account.");
          if (props.accountPassword) props.onWalletPasswordConsumed?.();
          setBackupPassword("");
        } finally {
          restored?.free();
          seed.fill(0);
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setAccountBackupState("error");
        setAccountBackupMessage(error instanceof Error ? error.message : "The account wallet could not be unlocked.");
        if (props.accountPassword) props.onWalletPasswordConsumed?.();
      });
    return () => { cancelled = true; };
  }, [props.accountWorkerId]);
  const verificationPositions = [2, 7, 11];

  function clearWallet() {
    walletRef.current?.free();
    walletRef.current = null;
    walletSeedRef.current?.fill(0);
    walletSeedRef.current = null;
    setAddress("");
    setSnapshot(null);
    setSyncError("");
  }

  useEffect(() => () => {
    walletRef.current?.free();
    walletRef.current = null;
    walletSeedRef.current?.fill(0);
    walletSeedRef.current = null;
  }, []);

  useEffect(() => {
    if (!address || showPhrase) return;
    const controller = new AbortController();
    setSyncBusy(true);
    setSyncError("");
    void fetchTestnetAddressSnapshot(address, controller.signal)
      .then((result) => setSnapshot(result))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setSyncError(error instanceof Error ? error.message : "Could not load testnet address activity.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setSyncBusy(false);
      });
    return () => controller.abort();
  }, [address, showPhrase]);

  async function createWallet() {
    setBusy(true);
    setStatus("");
    setDiagnostic("");
    clearWallet();

    let seed: Uint8Array | null = null;
    let createdWallet: BdkWallet | null = null;
    try {
      const phrase = createRecoveryPhrase();
      seed = await recoveryPhraseToSeed(phrase);
      await deleteEncryptedChangeset();
      const result = await createBdkTestnetWallet(seed);
      createdWallet = result.wallet;
      const changeset = await persistStagedWalletState(createdWallet, seed);
      pendingAccountBackupRef.current = JSON.stringify({ seedHex: bytesToHex(seed), changeset });
      walletRef.current = createdWallet;
      createdWallet = null;
      walletSeedRef.current = seed.slice();
      setAddress(result.address);
      setRecoveryPhrase(phrase);
      setVerificationWords(["", "", ""]);
      setShowPhrase(true);
      setStatus("Write down these 12 words in order. They are the wallet's recovery key. KIVORA never receives them.");
    } catch (error) {
      createdWallet?.free();
      const detail = describeWalletCreationError(error);
      console.error("KIVORA testnet wallet initialization failed:", error);
      setStatus("The testnet wallet could not be created and safely saved.");
      setDiagnostic(detail);
    } finally {
      seed?.fill(0);
      setBusy(false);
    }
  }

  async function confirmRecoveryPhrase() {
    const correct = verificationPositions.every((position, index) =>
      verificationWords[index].trim().toLowerCase() === phraseWords[position],
    );
    if (!correct) {
      setStatus("Those words do not match. Check your written recovery phrase and try again.");
      return;
    }
    setRecoveryPhrase("");
    setVerificationWords(["", "", ""]);
    setShowPhrase(false);
    setStatus("Recovery phrase verified. Keep it offline and private. You can now use the testnet wallet.");
    if (!props.accountWorkerId || !pendingAccountBackupRef.current) return;
    if (backupPassword.length < 12) {
      setAccountBackupMessage("Your wallet is ready on this device. Enter your KIVORA account password below to link an encrypted account backup.");
      return;
    }
    setBusy(true);
    try {
      const encrypted = await encryptAccountWalletBackup(pendingAccountBackupRef.current, backupPassword, props.accountWorkerId);
      const saved = await accountBackupRequest<{ saved: boolean; revision: number }>("PUT", { ...encrypted, ...(accountBackupExistsRef.current && accountBackupRevision !== null ? { revision: accountBackupRevision } : {}) });
      await rememberAccountWalletUnlockKey(encrypted, backupPassword, props.accountWorkerId);
      accountBackupExistsRef.current = true;
      setAccountBackupRevision(saved.revision);
      setAccountBackupState("ready");
      setAccountBackupMessage("Encrypted wallet backup saved to your KIVORA account. Future sign-ins can restore it without the 12 words.");
      pendingAccountBackupRef.current = null;
      setBackupPassword("");
    } catch (error) {
      setAccountBackupState("error");
      setAccountBackupMessage(error instanceof Error ? error.message : "The encrypted wallet backup could not be linked. Keep your recovery phrase safe.");
    } finally {
      setBusy(false);
    }
  }

  async function restoreFromPhrase() {
    setBusy(true);
    setStatus("");
    setDiagnostic("");
    clearWallet();

    let seed: Uint8Array | null = null;
    let restoredWallet: BdkWallet | null = null;
    try {
      seed = await recoveryPhraseToSeed(recoveryInput);
      const savedChangeset = await loadEncryptedChangeset(seed);
      const result = savedChangeset
        ? await restoreBdkTestnetWallet(seed, savedChangeset)
        : await createBdkTestnetWallet(seed);
      restoredWallet = result.wallet;
      if (!savedChangeset) await persistStagedWalletState(restoredWallet, seed);
      pendingAccountBackupRef.current = JSON.stringify({ seedHex: bytesToHex(seed), changeset: await loadEncryptedChangeset(seed) ?? savedChangeset ?? "" });
      walletRef.current = restoredWallet;
      restoredWallet = null;
      walletSeedRef.current = seed.slice();
      setAddress(result.address);
      setRecoveryInput("");
      setStatus("12-word recovery phrase accepted. Wallet keys were derived locally on this device.");
    } catch (error) {
      restoredWallet?.free();
      setStatus(error instanceof Error ? error.message : "The recovery phrase could not restore this wallet.");
    } finally {
      seed?.fill(0);
      setBusy(false);
    }
  }

  async function linkExistingWalletToAccount() {
    if (!props.accountWorkerId || !pendingAccountBackupRef.current || !backupPassword || busy) return;
    setBusy(true);
    setAccountBackupMessage("");
    try {
      if (backupPassword.length < 12) throw new Error("Use your KIVORA account password to encrypt this wallet backup.");
      const encrypted = await encryptAccountWalletBackup(pendingAccountBackupRef.current, backupPassword, props.accountWorkerId);
      const saved = await accountBackupRequest<{ saved: boolean; revision: number }>("PUT", { ...encrypted, ...(accountBackupExistsRef.current && accountBackupRevision !== null ? { revision: accountBackupRevision } : {}) });
      await rememberAccountWalletUnlockKey(encrypted, backupPassword, props.accountWorkerId);
      accountBackupExistsRef.current = true;
      setAccountBackupRevision(saved.revision);
      setAccountBackupState("ready");
      setAccountBackupMessage("This existing wallet is now linked to your KIVORA account with client-side encryption.");
      pendingAccountBackupRef.current = null;
      setBackupPassword("");
    } catch (error) {
      setAccountBackupMessage(error instanceof Error ? error.message : "The wallet could not be linked.");
      setAccountBackupState("error");
    } finally {
      setBusy(false);
    }
  }

  async function refreshAddressActivity() {
    if (!address || syncBusy) return;
    setSyncBusy(true);
    setSyncError("");
    try {
      const result = await fetchTestnetAddressSnapshot(address);
      setSnapshot(result);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Could not load testnet address activity.");
    } finally {
      setSyncBusy(false);
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
      setRecoveryPhrase("");
      setShowPhrase(false);
      setDiagnostic("");
      setStatus("Wallet and its encrypted local state were discarded.");
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
        Experimental testnet wallet. A standard 12-word English BIP39 phrase derives the wallet locally. No seed phrase or private key is sent to KIVORA servers.
        It can check the displayed receive address on Bitcoin testnet. It cannot send transactions. Do not use it for real BTC.
      </p>
      {!address ? (
        <>
          <div className="wallet-preflight">
            <p className="eyebrow">BEFORE YOU CREATE A WALLET</p>
            <h3>Protect your recovery phrase</h3>
            <ul>
              <li>KIVORA will generate a new 12-word recovery phrase on this device.</li>
              <li>Write all 12 words down offline, in the exact order, and keep them private.</li>
              <li>Anyone with the phrase can control this wallet. Never share it or save it in a screenshot.</li>
              <li>If you lose the phrase, KIVORA cannot recover the wallet for you.</li>
              <li>This is a Bitcoin testnet prototype. It can show read-only testnet address activity, but it cannot send Bitcoin or access real BTC.</li>
            </ul>
            <p className="privacy-note">Your phrase is shown once during setup. You will be asked to verify selected words before the wallet is ready.</p>
            {props.accountWorkerId && <label className="field">
              <span>KIVORA account password (encrypts the account backup)</span>
              <input type="password" value={backupPassword} onChange={(event) => setBackupPassword(event.target.value)} autoComplete="current-password" minLength={12} />
            </label>}
            {props.accountWorkerId && accountBackupState === "checking" && <p className="privacy-note">Checking your account wallet…</p>}
            {localWalletDetected && <p className="privacy-note">An encrypted wallet already exists in this browser. Restore it with its 12 words first. KIVORA will not replace it with a new wallet.</p>}
            {props.accountWorkerId && accountBackupState === "error" && <p className="wallet-sync-error" role="alert">{accountBackupMessage}</p>}
          </div>
          <button className="submit-button" type="button" onClick={() => void createWallet()} disabled={busy || accountBackupState === "checking" || accountBackupExistsRef.current || localWalletDetected || !localWalletCheckComplete}>
            <span>{busy ? "Creating testnet wallet…" : "I understand — create testnet wallet"}</span>
            <span aria-hidden="true">↗</span>
          </button>
          <div className="backup-controls">
            <p className="eyebrow">RESTORE WITH 12 WORDS</p>
            <label className="field">
              <span>12-word recovery phrase</span>
              <textarea value={recoveryInput} onChange={(event) => setRecoveryInput(event.target.value)} placeholder="Enter your 12 words in the correct order" rows={3} autoComplete="off" spellCheck={false} disabled={busy} />
            </label>
            <button className="unit-option" type="button" onClick={() => void restoreFromPhrase()} disabled={busy || recoveryInput.trim().split(/\s+/).length !== 12}>
              {busy ? "Restoring…" : "Restore with recovery phrase"}
            </button>
          </div>
        </>
      ) : showPhrase ? (
        <div className="testnet-result">
          <p className="eyebrow">YOUR 12-WORD RECOVERY PHRASE</p>
          <p className="privacy-note">Write these words down offline, in this exact order. KIVORA uses no additional BIP39 passphrase. Anyone with these words can control the wallet. Do not screenshot them, share them, or paste them into a chat. KIVORA cannot recover a lost phrase.</p>
          <ol className="recovery-words">
            {phraseWords.map((word, index) => (
              <li key={index}>
                <span className="recovery-word-index" aria-hidden="true">{index + 1}</span>
                <span className="recovery-word-text">{word}</span>
              </li>
            ))}
          </ol>
          <p className="eyebrow">VERIFY YOUR BACKUP</p>
          <p className="privacy-note">Enter the requested words from your written copy to confirm you saved them correctly.</p>
          {verificationPositions.map((position, index) => (
            <label className="field" key={position}>
              <span>Word {position + 1}</span>
              <input value={verificationWords[index]} onChange={(event) => setVerificationWords((current) => current.map((word, i) => i === index ? event.target.value : word))} autoComplete="off" spellCheck={false} disabled={busy} />
            </label>
          ))}
          <button className="submit-button" type="button" onClick={confirmRecoveryPhrase} disabled={busy || verificationWords.some((word) => !word.trim())}>I've saved and verified my phrase</button>
        </div>
      ) : (
        <div className="testnet-result">
          <div className="testnet-qr">
            <QRCodeSVG value={`bitcoin:${address}`} size={220} level="M" includeMargin />
          </div>
          <p className="eyebrow testnet-address-label">BITCOIN TESTNET RECEIVE ADDRESS</p>
          <p className="testnet-address">{address}</p>
          <div className="unit-options">
            <button className="unit-option selected" type="button" onClick={() => void copyAddress()}>Copy address</button>
            <button className="unit-option" type="button" onClick={() => void discardWallet()} disabled={busy || syncBusy}>Discard wallet</button>
          </div>
          {props.accountWorkerId && pendingAccountBackupRef.current && <div className="backup-controls">
            <p className="eyebrow">LINK THIS WALLET TO YOUR ACCOUNT</p>
            <label className="field">
              <span>KIVORA account password</span>
              <input type="password" value={backupPassword} onChange={(event) => setBackupPassword(event.target.value)} autoComplete="current-password" minLength={12} />
            </label>
            <button className="unit-option" type="button" onClick={() => void linkExistingWalletToAccount()} disabled={busy || backupPassword.length < 12}>
              {busy ? "Encrypting and linking…" : accountBackupExistsRef.current ? "Replace account backup using recovery phrase" : "Link existing wallet to my account"}
            </button>
            <p className="privacy-note">This is an explicit action. The recovery phrase and private keys stay on this device; only the encrypted backup is uploaded.</p>
          </div>}
          <div className="wallet-chain-panel">
            <div className="wallet-chain-heading">
              <div>
                <p className="eyebrow">TESTNET ADDRESS BALANCE</p>
                <h3>{snapshot ? `${formatSats(snapshot.totalSats)} sats` : "Balance not yet loaded"}</h3>
              </div>
              <span className="step-label">READ ONLY</span>
            </div>
            {snapshot && <div className="wallet-balance-breakdown">
              <span>Confirmed <strong>{formatSats(snapshot.confirmedSats)} sats</strong></span>
              <span>Unconfirmed <strong>{formatSats(snapshot.unconfirmedSats)} sats</strong></span>
            </div>}
            <button className="unit-option wallet-refresh" type="button" onClick={() => void refreshAddressActivity()} disabled={syncBusy}>
              {syncBusy ? "Checking testnet…" : "Refresh balance & activity"}
            </button>
            {syncError && <p className="wallet-sync-error" role="alert">{syncError}</p>}
            {snapshot && <p className="privacy-note">Updated {new Date(snapshot.fetchedAt).toLocaleTimeString()} · {snapshot.transactionCount} transactions reported for this address</p>}
            <div className="wallet-activity">
              <p className="eyebrow">RECENT ACTIVITY · THIS ADDRESS ONLY</p>
              {!snapshot && syncBusy && <p className="privacy-note">Connecting to the Bitcoin testnet explorer…</p>}
              {snapshot && snapshot.transactions.length === 0 && <p className="privacy-note">No transactions found for this receive address yet.</p>}
              {snapshot?.transactions.map((tx) => <div className="wallet-transaction" key={tx.txid}>
                <div className="wallet-transaction-main">
                  <strong>{tx.direction === "incoming" ? "Received" : tx.direction === "outgoing" ? "Sent" : "Wallet activity"}</strong>
                  <span>{tx.confirmed ? `${tx.confirmations} confirmations` : "Unconfirmed"}</span>
                </div>
                <div className="wallet-transaction-amount">
                  <strong>{tx.netSats > 0 ? "+" : ""}{formatSats(tx.netSats)} sats</strong>
                  <span>{tx.timestamp ? new Date(tx.timestamp * 1000).toLocaleString() : "Awaiting confirmation"}</span>
                </div>
                <a href={`https://blockstream.info/testnet/tx/${tx.txid}`} target="_blank" rel="noreferrer">View transaction</a>
              </div>)}
              {snapshot && snapshot.transactionCount > snapshot.transactions.length && <p className="privacy-note">Showing the latest {snapshot.transactions.length} transactions returned by the explorer. Older activity is not loaded yet.</p>}
            </div>
          </div>
          <p className="privacy-note">This is a read-only balance and activity check for the displayed receive address, not a full scan of every address in the wallet. The BDK state remains encrypted in this browser. No seed or private key is sent to the explorer. Sending is not enabled.</p>
        </div>
      )}
      {props.accountWorkerId && accountBackupMessage && <p className="privacy-note" role="status">{accountBackupMessage}</p>}
      {status && <p className="notice" role="status">{status}</p>}
      {diagnostic && <p className="privacy-note" role="status">Diagnostic: {diagnostic}</p>}
    </section>
  );
}
