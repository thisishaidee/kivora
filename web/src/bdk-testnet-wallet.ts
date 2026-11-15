import type { Wallet as BdkWallet } from "@bitcoindevkit/bdk-wallet-web";

export function validateTestnetSeed(seed: Uint8Array): void {
  if (seed.length < 16 || seed.length > 64) {
    throw new Error("A BDK seed must contain between 16 and 64 bytes.");
  }
}

/**
 * Creates a temporary testnet-only BDK wallet and derives its first receive address.
 * The caller owns the seed and must clear its byte array after this function returns.
 * No wallet state or key material is sent to KIVORA servers.
 */
export async function createBdkTestnetWallet(seed: Uint8Array): Promise<{ wallet: BdkWallet; address: string }> {
  validateTestnetSeed(seed);
  const bdk = await import("@bitcoindevkit/bdk-wallet-web");
  const descriptors = bdk.seed_to_descriptor(seed, "testnet", "p2wpkh");
  try {
    const wallet = bdk.Wallet.create("testnet", descriptors.external, descriptors.internal);
    if (wallet.network !== "testnet") {
      wallet.free();
      throw new Error("The wallet SDK did not create a testnet wallet.");
    }
    const addressInfo = wallet.reveal_next_address("external");
    const addressObject = addressInfo.address;
    const address = addressObject.toString();
    addressObject.free();
    addressInfo.free();
    return { wallet, address };
  } finally {
    descriptors.free();
  }
}
