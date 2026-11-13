import { describe, expect, it } from "vitest";
import { assessWorkRequest as assessTypeScript } from "../shared/src/intelligence";
import { assessWorkRequest as assessWorkerRuntime } from "../shared/src/intelligence-runtime.js";
import { parsePrivateEvidenceCapture } from "../shared/src/evidence-runtime.js";

describe("Worker-native assessment parity", () => {
  it.each([
    [{ trade: "plumbing", task: "A dripping kitchen tap", jurisdiction: "Nigeria" }],
    [{ trade: "plumbing", task: "I smell gas and suspect a gas leak." }],
    [{ trade: "electrical", task: "Explain the difference between a lamp and a light fitting.", jurisdiction: "Nigeria" }],
    [{ trade: "carpentry", task: "What is a table saw used for?", jurisdiction: "Nigeria" }],
  ])("matches the typed intelligence engine for the same request", (request) => {
    expect(assessWorkerRuntime(request)).toEqual(assessTypeScript(request));
  });

  it("matches reviewed exact-model evidence applicability", () => {
    const request = {
      trade: "plumbing",
      task: "Identify the cartridge for my kitchen tap.",
      jurisdiction: "Nigeria",
      involvesEquipment: true,
      equipmentMake: "Acme",
      equipmentModel: "K-100",
    };
    const evidence = [{
      id: "manual-k100",
      publisher: "Acme",
      title: "K-100 service manual",
      productModels: ["K-100"],
      productMake: "Acme",
      jurisdiction: "Nigeria",
      trade: "plumbing",
      topic: "cartridge identification",
      retrievedAt: "2026-11-13T10:00:00.000Z",
      excerpt: "Section 4.2 identifies the cartridge assembly.",
      reviewed: true,
    }];
    expect(assessWorkerRuntime(request, evidence)).toEqual(assessTypeScript(request, evidence));
  });
});

describe("Worker-native private evidence validation", () => {
  const valid = {
    trade: "plumbing",
    sourceType: "manufacturer_manual",
    publisher: "Acme",
    title: "K-100 service manual",
    sourceUrl: "https://manufacturer.example/manual.pdf",
    productMake: "Acme",
    productModel: "K-100",
    topic: "cartridge identification",
    evidenceNote: "Section 4.2 identifies the cartridge assembly.",
    language: "en",
  };

  it("accepts a valid HTTPS source note", () => {
    const parsed = parsePrivateEvidenceCapture(valid);
    expect(parsed.success).toBe(true);
    expect(parsed.data.rightsStatus).toBeUndefined();
  });

  it("rejects HTTP links and browser-supplied review or sharing claims", () => {
    expect(parsePrivateEvidenceCapture({ ...valid, sourceUrl: "http://unsafe.example/manual" }).success).toBe(false);
    expect(parsePrivateEvidenceCapture({ ...valid, review_status: "approved", visibility: "shared" }).success).toBe(false);
  });
});
