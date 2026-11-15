import type { Wallet as BdkWallet } from "@bitcoindevkit/bdk-wallet-web";

export type WalletCreationStage = "module-load" | "seed-validation" | "descriptor-derivation" | "wallet-create" | "wallet-restore" | "address-derivation";

export class WalletCreationError extends Error {
  constructor(readonly stage: WalletCreationStage, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "WalletCreationError";
  }
}

export function validateTestnetSeed(seed: Uint8Array): void {
  if (seed.length < 16 || seed.length > 64) {
    throw new WalletCreationError("seed-validation", "A BDK seed must contain between 16 and 64 bytes.");
  }
}

async function loadBdkModule(): Promise<typeof import("@bitcoindevkit/bdk-wallet-web")> {
  try {
    return await import("@bitcoindevkit/bdk-wallet-web");
  } catch (error) {
    throw new WalletCreationError("module-load", "The Bitcoin WebAssembly module did not load.", { cause: error });
  }
}

function getAddress(wallet: BdkWallet, index: number): string {
  const addressInfo = wallet.peek_address("external", index);
  try {
    const addressObject = addressInfo.address;
    try {
      const address = addressObject.toString();
      if (!address.startsWith("tb1")) {
        throw new Error("BDK returned an address that does not match native testnet SegWit.");
      }
      return address;
    } finally {
      addressObject.free();
    }
  } finally {
    addressInfo.free();
  }
}

/**
 * Creates a temporary testnet-only BDK wallet and derives its first receive address.
 * The caller owns the seed and must clear its byte array after this function returns.
 * No wallet state or key material is sent to KIVORA servers.
 */
export async function createBdkTestnetWallet(seed: Uint8Array): Promise<{ wallet: BdkWallet; address: string }> {
  validateTestnetSeed(seed);
  const bdk = await loadBdkModule();

  let descriptors: InstanceType<typeof bdk.DescriptorPair> | undefined;
  try {
    try {
      descriptors = bdk.seed_to_descriptor(seed, "testnet", "p2wpkh");
    } catch (error) {
      throw new WalletCreationError("descriptor-derivation", "BDK could not derive testnet descriptors from the temporary seed.", { cause: error });
    }

    let wallet: BdkWallet;
    try {
      wallet = bdk.Wallet.create("testnet", descriptors.external, descriptors.internal);
    } catch (error) {
      throw new WalletCreationError("wallet-create", "BDK rejected the testnet wallet descriptors.", { cause: error });
    }

    try {
      if (wallet.network !== "testnet") throw new Error("The SDK returned a wallet on an unexpected network.");
      const addressInfo = wallet.reveal_next_address("external");
      let address: string;
      try {
        const addressObject = addressInfo.address;
        try {
          address = addressObject.toString();
          if (!address.startsWith("tb1")) throw new Error("BDK returned an address that does not match native testnet SegWit.");
        } finally {
          addressObject.free();
        }
      } finally {
        addressInfo.free();
      }
      return { wallet, address };
    } catch (error) {
      wallet.free();
      throw new WalletCreationError("address-derivation", error instanceof Error ? error.message : "BDK could not derive a testnet receive address.", { cause: error });
    }
  } finally {
    descriptors?.free();
  }
}

/**
 * Restores a wallet from an encrypted, locally persisted BDK changeset and the user's seed.
 * The private descriptors are re-derived in memory from the seed; they are never stored in IndexedDB.
 */
export async function restoreBdkTestnetWallet(
  seed: Uint8Array,
  changesetJson: string,
): Promise<{ wallet: BdkWallet; address: string }> {
  validateTestnetSeed(seed);
  const bdk = await loadBdkModule();

  let descriptors: InstanceType<typeof bdk.DescriptorPair> | undefined;
  try {
    try {
      descriptors = bdk.seed_to_descriptor(seed, "testnet", "p2wpkh");
    } catch (error) {
      throw new WalletCreationError("descriptor-derivation", "BDK could not re-derive testnet descriptors from the backup seed.", { cause: error });
    }

    let changeset: InstanceType<typeof bdk.ChangeSet>;
    try {
      changeset = bdk.ChangeSet.from_json(changesetJson);
    } catch (error) {
      throw new WalletCreationError("wallet-restore", "The locally saved BDK changeset is invalid.", { cause: error });
    }

    let wallet: BdkWallet;
    try {
      wallet = bdk.Wallet.load(changeset, descriptors.external, descriptors.internal);
    } catch (error) {
      throw new WalletCreationError("wallet-restore", "BDK could not restore the wallet from its saved state.", { cause: error });
    }

    try {
      if (wallet.network !== "testnet") throw new Error("The restored wallet is not on Bitcoin testnet.");
      return { wallet, address: getAddress(wallet, 0) };
    } catch (error) {
      wallet.free();
      throw new WalletCreationError("wallet-restore", error instanceof Error ? error.message : "The restored wallet failed validation.", { cause: error });
    }
  } finally {
    descriptors?.free();
  }
}

export function describeWalletCreationError(error: unknown): string {
  if (error instanceof WalletCreationError) {
    const detail = error.cause instanceof Error ? error.cause.message : error.message;
    return `${error.stage}: ${detail.slice(0, 180)}`;
  }
  if (error instanceof Error) return `unexpected: ${error.message.slice(0, 180)}`;
  return "unexpected: Unknown browser or WebAssembly error.";
}
