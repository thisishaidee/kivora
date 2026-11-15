const FORMAT = "kivora-bdk-testnet-backup";
const VERSION = 1;
const NETWORK = "testnet";
const ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const MAX_BACKUP_CHARS = 16_384;
const encoder = new TextEncoder();

export type EncryptedWalletBackup = {
  format: typeof FORMAT;
  version: typeof VERSION;
  network: typeof NETWORK;
  kdf: { name: "PBKDF2"; hash: "SHA-256"; iterations: typeof ITERATIONS; salt: string };
  cipher: { name: "AES-GCM"; iv: string; ciphertext: string };
};

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

function validateSeed(seed: Uint8Array): void {
  if (seed.length !== 32) throw new Error("This backup format requires the 32-byte KIVORA testnet wallet seed.");
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

function additionalData(): Uint8Array {
  return encoder.encode(`${FORMAT}:v${VERSION}:${NETWORK}`);
}

/** Encrypts the 32-byte testnet derivation seed locally; no network request is made. */
export async function encryptTestnetWalletBackup(seed: Uint8Array, password: string): Promise<string> {
  validateSeed(seed);
  validatePassword(password);
  if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) {
    throw new Error("Secure browser cryptography is unavailable. Use a supported HTTPS browser.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: additionalData(), tagLength: 128 },
    key,
    seed,
  );
  const backup: EncryptedWalletBackup = {
    format: FORMAT,
    version: VERSION,
    network: NETWORK,
    kdf: { name: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS, salt: toBase64(salt) },
    cipher: { name: "AES-GCM", iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(ciphertext)) },
  };
  return JSON.stringify(backup, null, 2);
}

/** Decrypts and validates a locally selected backup; rejects other formats and networks. */
export async function decryptTestnetWalletBackup(serialized: string, password: string): Promise<Uint8Array> {
  validatePassword(password);
  if (serialized.length > MAX_BACKUP_CHARS) throw new Error("Backup file is too large.");
  if (!globalThis.crypto?.subtle) throw new Error("Secure browser cryptography is unavailable.");

  let backup: unknown;
  try {
    backup = JSON.parse(serialized);
  } catch {
    throw new Error("This file is not a valid KIVORA wallet backup.");
  }
  if (!backup || typeof backup !== "object") throw new Error("This file is not a valid KIVORA wallet backup.");

  const candidate = backup as Partial<EncryptedWalletBackup>;
  if (
    candidate.format !== FORMAT ||
    candidate.version !== VERSION ||
    candidate.network !== NETWORK ||
    candidate.kdf?.name !== "PBKDF2" ||
    candidate.kdf.hash !== "SHA-256" ||
    candidate.kdf.iterations !== ITERATIONS ||
    candidate.cipher?.name !== "AES-GCM"
  ) {
    throw new Error("Unsupported backup format or network.");
  }

  const salt = fromBase64(candidate.kdf.salt, SALT_BYTES);
  const iv = fromBase64(candidate.cipher.iv, IV_BYTES);
  const ciphertext = fromBase64(candidate.cipher.ciphertext);
  if (ciphertext.length !== 48) throw new Error("Backup ciphertext has an invalid length.");

  try {
    const key = await deriveKey(password, salt);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: additionalData(), tagLength: 128 },
      key,
      ciphertext,
    );
    const seed = new Uint8Array(plaintext);
    validateSeed(seed);
    return seed;
  } catch {
    throw new Error("Backup could not be unlocked. Check the password or use an intact backup file.");
  }
}
