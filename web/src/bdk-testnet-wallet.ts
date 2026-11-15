import type { Wallet as BdkWallet } from "@bitcoindevkit/bdk-wallet-web";

export type WalletCreationStage = "module-load" | "seed-validation" | "descriptor-derivation" | "wallet-create" | "address-derivation";

export class WalletCreationError extends Error {
  constructor(readonly stage: WalletCreationStage, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "WalletCreationError";
  }
}

export function validateTestnetSeed(seed: Uint8Array): void {
  if (seed.length < 16 || seed.length > 64) {
    throw new WalletCreationError("seed-validation", "The temporary seed length is invalid.");
  }
}

/**
 * Creates a temporary testnet-only BDK wallet and derives its first receive address.
 * The caller owns the seed and must clear its byte array after this function returns.
 * No wallet state or key material is sent to KIVORA servers.
 */
export async function createBdkTestnetWallet(seed: Uint8Array): Promise<{ wallet: BdkWallet; address: string }> {
  try {
    validateTestnetSeed(seed);
  } catch (error) {
    if (error instanceof WalletCreationError) throw error;
    throw new WalletCreationError("seed-validation", "Seed validation failed.", { cause: error });
  }

  let bdk: typeof import("@bitcoindevkit/bdk-wallet-web");
  try {
    bdk = await import("@bitcoindevkit/bdk-wallet-web");
  } catch (error) {
    throw new WalletCreationError("module-load", "The Bitcoin WebAssembly module did not load.", { cause: error });
  }

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
      if (wallet.network !== "testnet") {
        throw new Error("The SDK returned a wallet on an unexpected network.");
      }
      const addressInfo = wallet.reveal_next_address("external");
      try {
        const addressObject = addressInfo.address;
        try {
          const address = addressObject.toString();
          if (!address.startsWith("tb1")) {
            throw new Error("BDK returned an address that does not match native testnet SegWit.");
          }
          return { wallet, address };
        } finally {
          addressObject.free();
        }
      } finally {
        addressInfo.free();
      }
    } catch (error) {
      wallet.free();
      if (error instanceof WalletCreationError) throw error;
      throw new WalletCreationError("address-derivation", error instanceof Error ? error.message : "BDK could not derive a testnet receive address.", { cause: error });
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
