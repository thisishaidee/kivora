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
import { createRecoveryPhrase, recoveryPhraseToSeed } from "./bip39-recovery";

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
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [recoveryInput, setRecoveryInput] = useState("");
  const [verificationWords, setVerificationWords] = useState(["", "", ""]);
  const [showPhrase, setShowPhrase] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [diagnostic, setDiagnostic] = useState("");

  const phraseWords = recoveryPhrase ? recoveryPhrase.split(" ") : [];
  const verificationPositions = [2, 7, 11];

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

    let seed: Uint8Array | null = null;
    let createdWallet: BdkWallet | null = null;
    try {
      const phrase = createRecoveryPhrase();
      seed = await recoveryPhraseToSeed(phrase);
      await deleteEncryptedChangeset();
      const result = await createBdkTestnetWallet(seed);
      createdWallet = result.wallet;
      await persistStagedWalletState(createdWallet, seed);
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

  function confirmRecoveryPhrase() {
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
        It does not sync balances or send transactions. Do not use it for real BTC.
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
              <li>This is a Bitcoin testnet prototype. It cannot currently show a live balance or send Bitcoin.</li>
            </ul>
            <p className="privacy-note">Your phrase is shown once during setup. You will be asked to verify selected words before the wallet is ready.</p>
          </div>
          <button className="submit-button" type="button" onClick={() => void createWallet()} disabled={busy}>
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
            <button className="unit-option" type="button" onClick={() => void discardWallet()} disabled={busy}>Discard wallet</button>
          </div>
          <p className="privacy-note">The BDK state is also encrypted in this browser. Browser storage is not a backup. This prototype still does not sync balances or send transactions. Do not send coins until clean-device recovery and QR interoperability have been verified.</p>
        </div>
      )}
      {status && <p className="notice" role="status">{status}</p>}
      {diagnostic && <p className="privacy-note" role="status">Diagnostic: {diagnostic}</p>}
    </section>
  );
}
