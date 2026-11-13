import { describe, expect, it } from "vitest";
import { assessWorkRequest } from "../shared/src/intelligence";

const base = {
  trade: "plumbing",
  task: "My kitchen tap is dripping and I want to identify the cartridge.",
  jurisdiction: "Nigeria",
  equipmentMake: "Acme",
  equipmentModel: "K-100",
  knownFacts: [],
};

const reviewedEvidence = [{
  id: "manual-1",
  publisher: "Acme",
  title: "K-100 service manual",
  productModels: ["K-100"],
  trade: "plumbing",
  topic: "cartridge identification",
  retrievedAt: "2026-11-13T10:00:00.000Z",
  excerpt: "Exploded view identifies the cartridge assembly.",
  reviewed: true,
}];

describe("KIVORA deterministic intelligence gate", () => {
  it("allows evidence-backed routine guidance only when context is complete", () => {
    const result = assessWorkRequest(base, reviewedEvidence);
    expect(result.decision).toBe("guided");
    expect(result.compatibilityStatus).toBe("undetermined");
    expect(result.evidenceSources).toHaveLength(1);
  });

  it("does not treat unreviewed evidence as support", () => {
    const result = assessWorkRequest(base, [{ ...reviewedEvidence[0], reviewed: false }]);
    expect(result.decision).toBe("clarify");
    expect(result.evidenceSources).toHaveLength(0);
  });

  it("rejects evidence for a different product model", () => {
    const result = assessWorkRequest(base, [{ ...reviewedEvidence[0], productModels: ["K-200"] }]);
    expect(result.decision).toBe("clarify");
    expect(result.evidenceSources).toHaveLength(0);
  });

  it("forces stop-work escalation for an active gas leak", () => {
    const result = assessWorkRequest({
      ...base,
      task: "I can smell gas and found a gas leak near the cooker.",
    }, reviewedEvidence);
    expect(result.decision).toBe("escalate");
    expect(result.stopWork).toBe(true);
    expect(result.detectedHazards).toContain("gas-leak");
    expect(result.permittedGuidance[0]).toContain("avoid flames");
  });

  it("escalates electrical installation and repair without permitting a DIY procedure", () => {
    const result = assessWorkRequest({
      ...base,
      trade: "electrical",
      task: "I need to rewire a socket and test the circuit.",
    }, []);
    expect(result.decision).toBe("escalate");
    expect(result.escalationRequired).toBe(true);
    expect(result.permittedGuidance).toHaveLength(0);
  });

  it("keeps structural work escalated even when the task is otherwise described clearly", () => {
    const result = assessWorkRequest({
      ...base,
      trade: "construction",
      task: "Can I cut this load-bearing wall to widen a doorway?",
    }, []);
    expect(result.decision).toBe("escalate");
    expect(result.detectedHazards).toContain("structural-load");
  });

  it("asks for jurisdiction and exact model instead of inventing standards or specs", () => {
    const result = assessWorkRequest({
      trade: "hvac",
      task: "My air conditioner compressor is not starting.",
    }, []);
    expect(result.decision).toBe("clarify");
    expect(result.missingInformation).toContain("work jurisdiction");
    expect(result.missingInformation).toContain("equipment model");
    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.compatibilityStatus).toBe("undetermined");
  });

  it("rejects malformed requests and malformed evidence", () => {
    expect(() => assessWorkRequest({ trade: "unknown", task: "fix it" })).toThrow();
    expect(() => assessWorkRequest(base, [{ id: "not-enough-fields" }])).toThrow();
  });
});
