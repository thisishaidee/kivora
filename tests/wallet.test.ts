import { describe, expect, it } from "vitest";
import { NWCClient } from "@getalby/sdk/nwc";

const walletPubkey = "a".repeat(64);
const appSecret = "b".repeat(64);
const relay = encodeURIComponent("wss://relay.example.com");

describe("Nostr Wallet Connect credential parsing", () => {
  it("accepts a valid NWC connection URI with a secret", () => {
    const uri = `nostr+walletconnect://${walletPubkey}?relay=${relay}&secret=${appSecret}`;
    const parsed = NWCClient.parseWalletConnectUrl(uri, true);

    expect(parsed.walletPubkey).toBe(walletPubkey);
    expect(parsed.relayUrls).toEqual(["wss://relay.example.com"]);
    expect(parsed.secret).toBe(appSecret);
  });

  it("rejects a connection URI without a secret", () => {
    const uri = `nostr+walletconnect://${walletPubkey}?relay=${relay}`;
    expect(() => NWCClient.parseWalletConnectUrl(uri, true)).toThrow("missing secret");
  });

  it("rejects malformed wallet public keys", () => {
    const uri = `nostr+walletconnect://not-a-key?relay=${relay}&secret=${appSecret}`;
    expect(() => NWCClient.parseWalletConnectUrl(uri, true)).toThrow("invalid wallet pubkey");
  });

  it("rejects malformed connection secrets", () => {
    const uri = `nostr+walletconnect://${walletPubkey}?relay=${relay}&secret=short`;
    expect(() => NWCClient.parseWalletConnectUrl(uri, true)).toThrow("invalid secret");
  });

  it("rejects connection URIs without a relay", () => {
    const uri = `nostr+walletconnect://${walletPubkey}?secret=${appSecret}`;
    expect(() => NWCClient.parseWalletConnectUrl(uri, true)).toThrow("no relay URLs");
  });
});
