const DATABASE_NAME = "kivora-device-wallet";
const DATABASE_VERSION = 1;
const STORE_NAME = "device-vault";
const RECORD_ID = "testnet-primary";
const FORMAT_VERSION = 1;
const NETWORK = "bitcoin-testnet";

interface DeviceVaultRecord {
  id: string;
  formatVersion: number;
  network: string;
  key: CryptoKey;
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
  updatedAt: number;
}

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("This browser does not support local wallet storage."));
  }
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open this device's wallet vault."));
    request.onblocked = () => reject(new Error("The device wallet vault is busy in another tab."));
  }).catch((error: unknown) => {
    databasePromise = undefined;
    throw error;
  });
  return databasePromise;
}

async function getRecord(): Promise<DeviceVaultRecord | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(RECORD_ID);
    request.onsuccess = () => resolve(request.result as DeviceVaultRecord | undefined);
    request.onerror = () => reject(request.error ?? new Error("Could not read this device's wallet vault."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Reading the device wallet vault was aborted."));
  });
}

/**
 * Keeps a device-local encrypted copy of the BIP39-derived seed so the wallet can
 * reopen automatically on this same browser origin/profile. The non-extractable
 * AES key is stored as a CryptoKey in IndexedDB; plaintext seed bytes never are.
 * This is convenience persistence, not a substitute for the offline recovery phrase.
 */
export async function saveDeviceWalletSeed(seed: Uint8Array): Promise<void> {
  if (seed.length !== 64 || !globalThis.crypto?.subtle) {
    throw new Error("The device wallet seed is invalid or secure browser cryptography is unavailable.");
  }
  const db = await openDatabase();
  const existing = await getRecord();
  const key = existing?.key ?? await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const additionalData = new TextEncoder().encode(`${RECORD_ID}|${FORMAT_VERSION}|${NETWORK}`);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData, tagLength: 128 },
    key,
    seed,
  );
  const record: DeviceVaultRecord = {
    id: RECORD_ID,
    formatVersion: FORMAT_VERSION,
    network: NETWORK,
    key,
    iv: iv.slice().buffer as ArrayBuffer,
    ciphertext,
    updatedAt: Date.now(),
  };
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the device wallet vault."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Saving the device wallet vault was aborted."));
  });
}

export async function loadDeviceWalletSeed(): Promise<Uint8Array | null> {
  const record = await getRecord();
  if (!record) return null;
  if (
    record.id !== RECORD_ID ||
    record.formatVersion !== FORMAT_VERSION ||
    record.network !== NETWORK ||
    !record.key ||
    record.iv.byteLength !== 12 ||
    record.ciphertext.byteLength !== 80
  ) {
    throw new Error("The saved device wallet is damaged or uses an unsupported format. Restore with your 12-word phrase.");
  }
  const additionalData = new TextEncoder().encode(`${RECORD_ID}|${FORMAT_VERSION}|${NETWORK}`);
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(record.iv), additionalData, tagLength: 128 },
      record.key,
      record.ciphertext,
    );
    const seed = new Uint8Array(plaintext);
    if (seed.length !== 64) {
      seed.fill(0);
      throw new Error("The saved device wallet seed has an invalid length.");
    }
    return seed;
  } catch {
    throw new Error("KIVORA could not unlock the saved wallet on this device. Restore with your 12-word phrase; do not create a replacement.");
  }
}

export async function deleteDeviceWalletSeed(): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(RECORD_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove the device wallet vault."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Removing the device wallet vault was aborted."));
  });
}
