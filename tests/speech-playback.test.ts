import { describe, expect, it } from "vitest";
import { splitForSpeech } from "../web/src/SpeechPlayback";

describe("splitForSpeech", () => {
  it("returns no chunks for blank text", () => {
    expect(splitForSpeech("  \n ")).toEqual([]);
  });

  it("keeps short responses in one chunk", () => {
    expect(splitForSpeech("Check the exact model first.")).toEqual(["Check the exact model first."]);
  });

  it("splits long text without losing words or punctuation", () => {
    const source = ("Check the exact manufacturer model before proceeding. ").repeat(90).trim();
    const chunks = splitForSpeech(source);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 1_600)).toBe(true);
    expect(chunks.join(" ")).toBe(source.replace(/\s+/g, " "));
  });

  it("splits a long unbroken token at the configured limit", () => {
    const source = "x".repeat(3_500);
    const chunks = splitForSpeech(source);
    expect(chunks.map((chunk) => chunk.length)).toEqual([1_600, 1_600, 300]);
    expect(chunks.join("")).toBe(source);
  });
});
