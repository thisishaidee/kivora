const DATABASE_NAME = "kivora-testnet-wallet";
const DATABASE_VERSION = 1;
const STORE_NAME = "wallet-state";
const RECORD_ID = "testnet-primary";
const FORMAT_VERSION = 1;
const SDK_VERSION = "0.4.0";
const NETWORK = "testnet";
const DESCRIPTOR_POLICY = "bip84-p2wpkh";
const MAX_WRITE_RETRIES = 5;

interface EncryptedChangesetRecord {
  id: string;
  formatVersion: number;
  sdkVersion: string;
  network: string;
  descriptorPolicy: string;
  revision: number;
  salt: ArrayBuffer;
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
  updatedAt: number;
}

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase(factory: IDBFactory = indexedDB): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open local wallet storage."));
    request.onblocked = () => reject(new Error("Local wallet storage upgrade is blocked by another open tab."));
  }).catch((error: unknown) => {
    databasePromise = undefined;
    throw error;
  });
  databasePromise = pending;
  return pending;
}

function additionalData(revision: number): Uint8Array {
  return new TextEncoder().encode(
    [DATABASE_NAME, RECORD_ID, FORMAT_VERSION, SDK_VERSION, NETWORK, DESCRIPTOR_POLICY, revision].join("|"),
  );
}

async function deriveStorageKey(seed: Uint8Array, salt: Uint8Array, cryptoApi: Crypto): Promise<CryptoKey> {
  if (seed.length !== 32 && seed.length !== 64) throw new Error("The wallet seed is invalid.");
  const material = await cryptoApi.subtle.importKey("raw", seed, "HKDF", false, ["deriveKey"]);
  return cryptoApi.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt,
      info: new TextEncoder().encode("KIVORA BDK testnet changeset storage key v1"),
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptChangesetPayload(
  plaintext: string,
  seed: Uint8Array,
  salt: Uint8Array,
  iv: Uint8Array,
  revision: number,
  cryptoApi: Crypto = crypto,
): Promise<ArrayBuffer> {
  const key = await deriveStorageKey(seed, salt, cryptoApi);
  return cryptoApi.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: additionalData(revision), tagLength: 128 },
    key,
    new TextEncoder().encode(plaintext),
  );
}

export async function decryptChangesetPayload(
  ciphertext: ArrayBuffer,
  seed: Uint8Array,
  salt: Uint8Array,
  iv: Uint8Array,
  revision: number,
  cryptoApi: Crypto = crypto,
): Promise<string> {
  const key = await deriveStorageKey(seed, salt, cryptoApi);
  const plaintext = await cryptoApi.subtle.decrypt(
    { name: "AES-GCM", iv, additionalData: additionalData(revision), tagLength: 128 },
    key,
    ciphertext,
  );
  return new TextDecoder("utf-8", { fatal: true }).decode(plaintext);
}

function readRecord(db: IDBDatabase): Promise<EncryptedChangesetRecord | undefined> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(RECORD_ID);
    request.onsuccess = () => resolve(request.result as EncryptedChangesetRecord | undefined);
    request.onerror = () => reject(request.error ?? new Error("Could not read local wallet state."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local wallet read was aborted."));
  });
}

function writeIfRevisionMatches(
  db: IDBDatabase,
  record: EncryptedChangesetRecord,
  expectedRevision: number,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    let conflict = false;
    const request = store.get(RECORD_ID);
    request.onsuccess = () => {
      const current = request.result as EncryptedChangesetRecord | undefined;
      if ((current?.revision ?? 0) !== expectedRevision) {
        conflict = true;
        transaction.abort();
        return;
      }
      store.put(record);
    };
    request.onerror = () => {
      transaction.abort();
      reject(request.error ?? new Error("Could not verify the wallet-state revision."));
    };
    transaction.oncomplete = () => resolve(true);
    transaction.onabort = () => {
      if (conflict) resolve(false);
      else reject(transaction.error ?? new Error("Local wallet state could not be saved."));
    };
    transaction.onerror = () => {
      if (!conflict) reject(transaction.error ?? new Error("Local wallet state could not be saved."));
    };
  });
}

function validateRecord(record: EncryptedChangesetRecord): void {
  if (
    record.id !== RECORD_ID ||
    record.formatVersion !== FORMAT_VERSION ||
    record.sdkVersion !== SDK_VERSION ||
    record.network !== NETWORK ||
    record.descriptorPolicy !== DESCRIPTOR_POLICY ||
    !Number.isSafeInteger(record.revision) ||
    record.revision < 1 ||
    record.salt.byteLength !== 16 ||
    record.iv.byteLength !== 12 ||
    record.ciphertext.byteLength < 16
  ) throw new Error("The saved testnet wallet state has an unsupported or invalid format.");
}

/** Persist a BDK ChangeSet JSON delta. The accumulated state is encrypted before IndexedDB sees it. */
export async function saveEncryptedChangeset(deltaJson: string, seed: Uint8Array): Promise<void> {
  if (typeof indexedDB === "undefined" || typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("This browser does not support encrypted local wallet persistence.");
  }
  if ((seed.length !== 32 && seed.length !== 64) || !deltaJson.trim()) throw new Error("Wallet state or seed is invalid.");

  const { ChangeSet } = await import("@bitcoindevkit/bdk-wallet-web");
  const db = await openDatabase();
  for (let attempt = 0; attempt < MAX_WRITE_RETRIES; attempt += 1) {
    const current = await readRecord(db);
    let mergedJson = deltaJson;
    const salt = current ? new Uint8Array(current.salt) : crypto.getRandomValues(new Uint8Array(16));

    if (current) {
      validateRecord(current);
      const previousJson = await decryptChangesetPayload(
        current.ciphertext, seed, salt, new Uint8Array(current.iv), current.revision,
      );
      const previous = ChangeSet.from_json(previousJson);
      const delta = ChangeSet.from_json(deltaJson);
      try {
        previous.merge(delta);
        mergedJson = previous.to_json();
      } finally {
        previous.free();
        // merge() consumes the delta ChangeSet by value; do not free it again.
      }
    }

    const revision = (current?.revision ?? 0) + 1;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await encryptChangesetPayload(mergedJson, seed, salt, iv, revision);
    const nextRecord: EncryptedChangesetRecord = {
      id: RECORD_ID,
      formatVersion: FORMAT_VERSION,
      sdkVersion: SDK_VERSION,
      network: NETWORK,
      descriptorPolicy: DESCRIPTOR_POLICY,
      revision,
      salt: salt.slice().buffer as ArrayBuffer,
      iv: iv.slice().buffer as ArrayBuffer,
      ciphertext,
      updatedAt: Date.now(),
    };
    if (await writeIfRevisionMatches(db, nextRecord, current?.revision ?? 0)) return;
  }
  throw new Error("Wallet state changed in another tab too many times. Retry the operation.");
}

/** Return a decrypted BDK ChangeSet JSON string, or null when no local state exists. */
export async function loadEncryptedChangeset(seed: Uint8Array): Promise<string | null> {
  if (typeof indexedDB === "undefined" || typeof crypto === "undefined" || !crypto.subtle) {
    throw new Error("This browser does not support encrypted local wallet persistence.");
  }
  const db = await openDatabase();
  const record = await readRecord(db);
  if (!record) return null;
  validateRecord(record);
  return decryptChangesetPayload(
    record.ciphertext, seed, new Uint8Array(record.salt), new Uint8Array(record.iv), record.revision,
  );
}

/** Delete the local encrypted testnet state. The user's exported backup is unaffected. */
export async function deleteEncryptedChangeset(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(RECORD_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not delete local wallet state."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Local wallet deletion was aborted."));
  });
}


/** Check whether wallet state exists without requiring the user's seed. */
export async function hasEncryptedChangeset(): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  const db = await openDatabase();
  const record = await readRecord(db);
  return Boolean(record);
}
