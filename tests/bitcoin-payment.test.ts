import { describe, expect, it } from "vitest";
import {
  parseBitcoinPaymentRequest,
  PaymentRequestError,
} from "../shared/src/bitcoin-payment";

const MAINNET_ADDRESS = "1BoatSLRHtKNngkdXEeobR76b53LETtpyT";

describe("Bitcoin payment request parser", () => {
  it("parses a mainnet BIP21 request without an amount", () => {
    expect(parseBitcoinPaymentRequest(`bitcoin:${MAINNET_ADDRESS}`)).toMatchObject({
      kind: "onchain",
      network: "mainnet",
      address: MAINNET_ADDRESS,
      amountSats: null,
      source: "bitcoin-uri",
      addressValidation: "requires-wallet-adapter",
    });
  });

  it("converts decimal BTC to exact integer satoshis", () => {
    expect(parseBitcoinPaymentRequest(`bitcoin:${MAINNET_ADDRESS}?amount=0.00123456&label=Workshop`)).toMatchObject({
      amountSats: 123456,
      label: "Workshop",
    });
  });

  it("parses a Lightning invoice as a separate payment rail", () => {
    expect(parseBitcoinPaymentRequest("lnbc2500n1example")).toMatchObject({
      kind: "lightning",
      network: "mainnet",
      amountSats: null,
      source: "lightning-invoice",
    });
  });

  it("rejects unsupported schemes and malformed addresses", () => {
    expect(() => parseBitcoinPaymentRequest("https://example.com")).toThrow(PaymentRequestError);
    expect(() => parseBitcoinPaymentRequest("bitcoin:not-an-address")).toThrowError("invalid_address_format");
  });

  it("rejects zero, negative, exponent and excessive precision amounts", () => {
    for (const amount of ["0", "-1", "1e-3", "0.000000001", "01.2"]) {
      expect(() => parseBitcoinPaymentRequest(`bitcoin:${MAINNET_ADDRESS}?amount=${amount}`)).toThrow(PaymentRequestError);
    }
  });

  it("rejects amounts above the Bitcoin monetary limit", () => {
    expect(() => parseBitcoinPaymentRequest(`bitcoin:${MAINNET_ADDRESS}?amount=21000000.00000001`)).toThrowError("amount_out_of_range");
  });

  it("rejects duplicate and unknown required parameters", () => {
    expect(() => parseBitcoinPaymentRequest(`bitcoin:${MAINNET_ADDRESS}?amount=1&amount=2`)).toThrowError("duplicate_parameter");
    expect(() => parseBitcoinPaymentRequest(`bitcoin:${MAINNET_ADDRESS}?req-future=1`)).toThrowError("unsupported_required_parameter");
  });

  it("rejects a Lightning invoice whose network conflicts with the address", () => {
    expect(() => parseBitcoinPaymentRequest(`bitcoin:${MAINNET_ADDRESS}?lightning=lntb2500n1example`)).toThrowError("network_mismatch");
  });

  it("does not claim address checksum validation", () => {
    const request = parseBitcoinPaymentRequest(`bitcoin:${MAINNET_ADDRESS}`);
    expect(request.kind === "onchain" && request.addressValidation).toBe("requires-wallet-adapter");
  });
});
