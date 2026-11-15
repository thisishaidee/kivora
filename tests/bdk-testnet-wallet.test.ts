import { describe, expect, it } from "vitest";
import { validateTestnetSeed } from "../web/src/bdk-testnet-wallet";

describe("BDK testnet seed boundary", () => {
  it("accepts a 32-byte browser-generated seed", () => {
    expect(() => validateTestnetSeed(new Uint8Array(32))).not.toThrow();
  });

  it("rejects seeds shorter than 16 bytes", () => {
    expect(() => validateTestnetSeed(new Uint8Array(15))).toThrow("between 16 and 64 bytes");
  });

  it("rejects seeds longer than 64 bytes", () => {
    expect(() => validateTestnetSeed(new Uint8Array(65))).toThrow("between 16 and 64 bytes");
  });
});
