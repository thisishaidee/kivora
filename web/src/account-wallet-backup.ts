const FORMAT_VERSION = 1 as const;
const NETWORK = "bitcoin-testnet" as const;
const KDF_ITERATIONS = 600_000;
const MIN_KDF_ITERATIONS = 300_000;
const MAX_KDF_ITERATIONS = 1_000_000;
const MAX_CIPHERTEXT_BYTES = 256 * 1024;

export type EncryptedAccountWalletBackup = {
  formatVersion: typeof FORMAT_VERSION;
  network: typeof NETWORK;
  kdf: "PBKDF2-SHA-256";
  iterations: number;
  salt: string;
  cipher: "AES-256-GCM";
  iv: string;
  ciphertext: string;
};

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string, maxBytes: number): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("The encrypted wallet backup is malformed.");
  }
  const binary = atob(value);
  if (!binary.length || binary.length > maxBytes) throw new Error("The encrypted wallet backup has an invalid size.");
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function associatedData(workerId: string): Uint8Array {
  if (!/^[0-9a-f-]{36}$/i.test(workerId)) throw new Error("The account identity is invalid.");
  return new TextEncoder().encode(`KIVORA-WALLET|v${FORMAT_VERSION}|${NETWORK}|${workerId}`);
}

async function deriveEncryptionKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  if (password.length < 12 || password.length > 128) throw new Error("The account password cannot unlock this wallet backup.");
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Encrypts a serialized BDK backup in the browser. The plaintext is never returned or uploaded. */
export async function encryptAccountWalletBackup(
  serializedBackup: string,
  password: string,
  workerId: string,
): Promise<EncryptedAccountWalletBackup> {
  if (!serializedBackup || new TextEncoder().encode(serializedBackup).byteLength > MAX_CIPHERTEXT_BYTES) {
    throw new Error("The wallet backup is empty or too large.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(password, salt, KDF_ITERATIONS);
  const plaintext = new TextEncoder().encode(serializedBackup);
  try {
    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: associatedData(workerId), tagLength: 128 },
      key,
      plaintext,
    );
    return {
      formatVersion: FORMAT_VERSION,
      network: NETWORK,
      kdf: "PBKDF2-SHA-256",
      iterations: KDF_ITERATIONS,
      salt: toBase64(salt),
      cipher: "AES-256-GCM",
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(encrypted)),
    };
  } finally {
    plaintext.fill(0);
  }
}

/** Decrypts only in the browser. Wrong passwords, altered ciphertext, or cross-account copies fail closed. */
export async function decryptAccountWalletBackup(
  backup: EncryptedAccountWalletBackup,
  password: string,
  workerId: string,
): Promise<string> {
  if (
    backup?.formatVersion !== FORMAT_VERSION ||
    backup.network !== NETWORK ||
    backup.kdf !== "PBKDF2-SHA-256" ||
    backup.cipher !== "AES-256-GCM" ||
    !Number.isInteger(backup.iterations) ||
    backup.iterations < MIN_KDF_ITERATIONS ||
    backup.iterations > MAX_KDF_ITERATIONS
  ) throw new Error("This wallet backup format is not supported.");
  const salt = fromBase64(backup.salt, 16);
  const iv = fromBase64(backup.iv, 12);
  const ciphertext = fromBase64(backup.ciphertext, MAX_CIPHERTEXT_BYTES + 16);
  if (salt.byteLength !== 16 || iv.byteLength !== 12 || ciphertext.byteLength < 17) {
    throw new Error("The encrypted wallet backup is malformed.");
  }
  const key = await deriveEncryptionKey(password, salt, backup.iterations);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: associatedData(workerId), tagLength: 128 },
      key,
      ciphertext,
    );
    const bytes = new Uint8Array(plaintext);
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } finally {
      bytes.fill(0);
    }
  } catch {
    throw new Error("This password could not unlock the wallet backup. Use your 12-word recovery phrase if you have reset your account password.");
  }
}
