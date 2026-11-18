import { describe, expect, it } from "vitest";
import { parsePrivateEvidenceCapture } from "../shared/src/evidence-runtime.js";

const capture = (sourceUrl: string) => parsePrivateEvidenceCapture({
  trade: "carpentry",
  sourceType: "manufacturer_manual",
  publisher: "Example Manufacturer",
  title: "Installation manual",
  sourceUrl,
  language: "en",
  topic: "Cabinet hinge installation",
  evidenceNote: "The document identifies the hinge adjustment procedure.",
});

describe("private evidence source URL validation", () => {
  it("accepts HTTPS publisher links without credentials", () => {
    expect(capture("https://docs.example.com/manual.pdf").success).toBe(true);
  });

  it.each([
    "http://docs.example.com/manual.pdf",
    "https://user:pass@docs.example.com/manual.pdf",
    "https://localhost/manual.pdf",
    "https://service.local/manual.pdf",
    "https://printer.internal/manual.pdf",
    "https://kivora.test/manual.pdf",
    "https://127.0.0.1/manual.pdf",
    "https://192.168.1.10/manual.pdf",
    "https://[::1]/manual.pdf",
    "https://-bad.example.com/manual.pdf",
  ])("rejects unsafe or deceptive URL %s", (url) => {
    expect(capture(url).success).toBe(false);
  });

  it("allows a private source note without a public URL", () => {
    const result = parsePrivateEvidenceCapture({
      trade: "carpentry",
      sourceType: "other",
      publisher: "Worker supplied",
      title: "Workshop note",
      language: "en",
      topic: "Cabinet assembly",
      evidenceNote: "Private note without an external source link.",
    });
    expect(result.success).toBe(true);
  });
});
