const FORMAT = "kivora-bdk-testnet-backup";
const VERSION_V1 = 1;
const VERSION_V2 = 2;
const NETWORK = "testnet";
const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const MAX_BACKUP_CHARS = 4_000_000;
const encoder = new TextEncoder();

type KdfMetadata = { name: "PBKDF2"; hash: "SHA-256"; iterations: typeof ITERATIONS; salt: string };
type CipherMetadata = { name: "AES-GCM"; iv: string; ciphertext: string };

type BackupV1 = {
  format: typeof FORMAT;
  version: typeof VERSION_V1;
  network: typeof NETWORK;
  kdf: KdfMetadata;
  cipher: CipherMetadata;
};

type BackupV2 = {
  format: typeof FORMAT;
  version: typeof VERSION_V2;
  network: typeof NETWORK;
  descriptorPolicy: "bip84-p2wpkh";
  sdkVersion: "0.4.0";
  kdf: KdfMetadata;
  cipher: CipherMetadata;
};

export type DecryptedTestnetWalletBackup =
  | { version: 1; seed: Uint8Array; changesetJson: null }
  | { version: 2; seed: Uint8Array; changesetJson: string };

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

function fromBase64(value: string, expectedLength?: number): Uint8Array {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value) || value.length % 4 !== 0) {
    throw new Error("Backup encoding is invalid.");
  }
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  if (expectedLength !== undefined && bytes.length !== expectedLength) {
    throw new Error("Backup metadata has an invalid length.");
  }
  return bytes;
}

function validatePassword(password: string): void {
  if (password.length < 12 || password.length > 1024) {
    throw new Error("Use a backup password with at least 12 characters.");
  }
}

function validateLegacySeed(seed: Uint8Array): void {
  if (seed.length !== 32) throw new Error("This legacy backup format requires the original 32-byte KIVORA testnet wallet seed.");
}

function validateWalletSeed(seed: Uint8Array): void {
  if (seed.length !== 32 && seed.length !== 64) {
    throw new Error("This backup requires a supported 32-byte legacy or 64-byte BIP39-derived wallet seed.");
  }
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password.normalize("NFC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function additionalData(version: number): Uint8Array {
  return encoder.encode(`${FORMAT}:v${version}:${NETWORK}`);
}

async function encryptPayload(payload: string, password: string, version: 1 | 2): Promise<{ kdf: KdfMetadata; iv: string; ciphertext: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: additionalData(version), tagLength: 128 },
    key,
    encoder.encode(payload),
  );
  return {
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS, salt: toBase64(salt) },
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

/** Creates a v1-compatible seed-only backup. Kept for compatibility tests and old-file support. */
export async function encryptTestnetWalletBackup(seed: Uint8Array, password: string): Promise<string> {
  validateLegacySeed(seed);
  validatePassword(password);
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error("Secure browser cryptography is unavailable. Use a supported HTTPS browser.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: additionalData(1), tagLength: 128 },
    key,
    seed,
  );
  const backup: BackupV1 = {
    format: FORMAT,
    version: VERSION_V1,
    network: NETWORK,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS, salt: toBase64(salt) },
    cipher: { name: "AES-GCM", iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) },
  };
  return JSON.stringify(backup, null, 2);
}

/** Creates a v2 encrypted seed + BDK changeset backup. Changeset must be the BDK-native JSON snapshot. */
export async function encryptTestnetWalletBackupV2(
  seed: Uint8Array,
  changesetJson: string,
  password: string,
): Promise<string> {
  validateWalletSeed(seed);
  validatePassword(password);
  if (!changesetJson.trim() || changesetJson.length > 3_000_000) {
    throw new Error("The BDK wallet state is empty or too large to back up.");
  }
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error("Secure browser cryptography is unavailable. Use a supported HTTPS browser.");
  }
  let parsed: unknown;
  try { parsed = JSON.parse(changesetJson); } catch { throw new Error("BDK wallet state is not valid JSON."); }
  if (!parsed || typeof parsed !== "object") throw new Error("BDK wallet state has an invalid format.");

  const payload = JSON.stringify({
    seed: toBase64(seed),
    changesetJson,
    network: NETWORK,
    descriptorPolicy: "bip84-p2wpkh",
    sdkVersion: "0.4.0",
  });
  const encrypted = await encryptPayload(payload, password, 2);
  const backup: BackupV2 = {
    format: FORMAT,
    version: VERSION_V2,
    network: NETWORK,
    descriptorPolicy: "bip84-p2wpkh",
    sdkVersion: "0.4.0",
    kdf: encrypted.kdf,
    cipher: { name: "AES-GCM", iv: encrypted.iv, ciphertext: encrypted.ciphertext },
  };
  return JSON.stringify(backup, null, 2);
}

/** Decrypts v1 seed-only and v2 full-state backups. */
export async function decryptTestnetWalletBackup(
  serialized: string,
  password: string,
): Promise<DecryptedTestnetWalletBackup> {
  validatePassword(password);
  if (serialized.length > MAX_BACKUP_CHARS) throw new Error("Backup file is too large.");
  if (!globalThis.crypto?.subtle) throw new Error("Secure browser cryptography is unavailable.");

  let backup: unknown;
  try { backup = JSON.parse(serialized); } catch { throw new Error("This file is not a valid KIVORA wallet backup."); }
  if (!backup || typeof backup !== "object") throw new Error("This file is not a valid KIVORA wallet backup.");

  const candidate = backup as {
    format?: string;
    version?: number;
    network?: string;
    descriptorPolicy?: string;
    sdkVersion?: string;
    kdf?: Partial<KdfMetadata>;
    cipher?: Partial<CipherMetadata>;
  };
  const version = candidate.version;
  if (
    candidate.format !== FORMAT ||
    (version !== VERSION_V1 && version !== VERSION_V2) ||
    candidate.network !== NETWORK ||
    candidate.kdf?.name !== "PBKDF2" ||
    candidate.kdf.hash !== "SHA-256" ||
    candidate.kdf.iterations !== ITERATIONS ||
    candidate.cipher?.name !== "AES-GCM" ||
    typeof candidate.kdf?.salt !== "string" ||
    typeof candidate.cipher?.iv !== "string" ||
    typeof candidate.cipher?.ciphertext !== "string"
  ) throw new Error("Unsupported backup format or network.");

  if (version === VERSION_V2 && (
    candidate.descriptorPolicy !== "bip84-p2wpkh" || candidate.sdkVersion !== "0.4.0"
  )) throw new Error("Unsupported backup descriptor policy or BDK version.");

  const salt = fromBase64(candidate.kdf!.salt!, SALT_BYTES);
  const iv = fromBase64(candidate.cipher!.iv!, IV_BYTES);
  const ciphertext = fromBase64(candidate.cipher!.ciphertext!);
  if (ciphertext.length < 48 || ciphertext.length > 3_100_000) throw new Error("Backup ciphertext has an invalid length.");

  try {
    const key = await deriveKey(password, salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: additionalData(version), tagLength: 128 },
      key,
      ciphertext,
    );
    if (version === VERSION_V1) {
      // Original v1 encrypted the raw 32-byte seed, not a JSON payload.
      const legacySeed = new Uint8Array(plaintext);
      if (legacySeed.length === 32) {
        validateSeed(legacySeed);
        return { version: 1, seed: legacySeed, changesetJson: null };
      }
      // Accept the short-lived JSON-wrapped v1 format if one was exported.
      const legacyText = new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
      const value = JSON.parse(legacyText) as { seed?: string };
      const seed = fromBase64(value.seed ?? "", 32);
      return { version: 1, seed, changesetJson: null };
    }
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
    const payload = JSON.parse(decoded) as {
      seed?: string;
      changesetJson?: string;
      network?: string;
      descriptorPolicy?: string;
      sdkVersion?: string;
    };
    if (
      payload.network !== NETWORK ||
      payload.descriptorPolicy !== "bip84-p2wpkh" ||
      payload.sdkVersion !== "0.4.0" ||
      typeof payload.changesetJson !== "string" ||
      payload.changesetJson.length > 3_000_000
    ) throw new Error("Backup wallet state metadata is invalid.");
    const changeset = JSON.parse(payload.changesetJson) as unknown;
    if (!changeset || typeof changeset !== "object") throw new Error("Backup BDK changeset is invalid.");
    const seed = fromBase64(payload.seed ?? "");
    validateWalletSeed(seed);
    return { version: 2, seed, changesetJson: payload.changesetJson };
  } catch (error) {
    if (error instanceof Error && error.message.includes("metadata is invalid")) throw error;
    if (error instanceof Error && error.message.includes("changeset is invalid")) throw error;
    throw new Error("Backup could not be unlocked. Check the password or use an intact backup file.");
  }
}
