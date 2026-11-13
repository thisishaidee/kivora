import { describe, expect, it } from "vitest";
import { assessWorkRequest } from "../shared/src/intelligence";

const base = {
  trade: "plumbing",
  task: "My kitchen tap is dripping and I want to identify the cartridge.",
  jurisdiction: "Nigeria",
  involvesEquipment: true,
  equipmentMake: "Acme",
  equipmentModel: "K-100",
  knownFacts: ["This is a water supply tap and the water supply has been isolated."],
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
      task: "Install an air conditioner and confirm compliance with local electrical regulations.",
      involvesEquipment: true,
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


describe("trade risk and evidence relevance", () => {
  it("does not escalate every ordinary electrical task by trade label alone", () => {
    const result = assessWorkRequest({
      trade: "electrical",
      task: "Explain the difference between a lamp and a light fitting.",
      jurisdiction: "Nigeria",
    });
    expect(result.decision).toBe("clarify");
    expect(result.escalationRequired).toBe(false);
  });

  it("does not escalate a normal table-saw question solely because the tool is mentioned", () => {
    const result = assessWorkRequest({
      trade: "carpentry",
      task: "What is a table saw used for?",
      jurisdiction: "Nigeria",
    });
    expect(result.escalationRequired).toBe(false);
    expect(result.stopWork).toBe(false);
  });

  it("does not accept reviewed evidence whose topic is unrelated to the task", () => {
    const result = assessWorkRequest(base, [{
      ...reviewedEvidence[0],
      topic: "compressor refrigerant charging",
    }]);
    expect(result.decision).toBe("clarify");
    expect(result.evidenceSources).toHaveLength(0);
  });
});


describe("equipment context handling", () => {
  it("does not demand a make and model for a general non-equipment task", () => {
    const result = assessWorkRequest({
      trade: "carpentry",
      task: "How do I identify the grain direction before sanding timber?",
      jurisdiction: "Nigeria",
    });
    expect(result.missingInformation).not.toContain("equipment make");
    expect(result.missingInformation).not.toContain("equipment model");
  });

  it("requires exact make and model when the worker marks equipment as involved", () => {
    const result = assessWorkRequest({
      trade: "hvac",
      task: "The air conditioner compressor is not starting.",
      jurisdiction: "Nigeria",
      involvesEquipment: true,
    });
    expect(result.missingInformation).toContain("equipment make");
    expect(result.missingInformation).toContain("equipment model");
    expect(result.questions.some((question) => question.includes("exact model"))).toBe(true);
  });
});


describe("evidence jurisdiction and make applicability", () => {
  it("does not use evidence reviewed for another jurisdiction", () => {
    const result = assessWorkRequest(base, [{
      ...reviewedEvidence[0],
      jurisdiction: "France",
    }]);
    expect(result.decision).toBe("clarify");
    expect(result.evidenceSources).toHaveLength(0);
  });

  it("does not use model-family evidence for a different manufacturer", () => {
    const result = assessWorkRequest(base, [{
      ...reviewedEvidence[0],
      productMake: "OtherBrand",
    }]);
    expect(result.decision).toBe("clarify");
    expect(result.evidenceSources).toHaveLength(0);
  });
});


describe("trade-specific context prompts", () => {
  it("does not ask for jurisdiction or fabrication dimensions for a general carpentry explanation", () => {
    const result = assessWorkRequest({
      trade: "carpentry",
      task: "How do I identify grain direction before sanding timber?",
    });
    expect(result.missingInformation).not.toContain("work jurisdiction");
    expect(result.missingInformation).not.toContain("material or board type");
    expect(result.missingInformation).not.toContain("required dimensions and thickness");
  });

  it("asks for material and dimensions before a carpentry fabrication task", () => {
    const result = assessWorkRequest({
      trade: "carpentry",
      task: "I need to cut and assemble a cabinet door.",
    });
    expect(result.questions).toContain("What material or board type are you working with, such as solid timber, plywood or MDF?");
    expect(result.questions).toContain("What are the required dimensions and material thickness?");
  });

  it("asks for system type and safe isolation on a plumbing leak", () => {
    const result = assessWorkRequest({
      trade: "plumbing",
      task: "There is a leak from a kitchen tap.",
    });
    expect(result.questions).toContain("Is this a water-supply, drainage or gas system?");
    expect(result.questions).toContain("Has the affected supply been isolated safely?");
    expect(result.missingInformation).not.toContain("work jurisdiction");
  });

  it("asks HVAC diagnostic context only for a repair task", () => {
    const general = assessWorkRequest({ trade: "hvac", task: "What does a compressor do?" });
    const repair = assessWorkRequest({ trade: "hvac", task: "Repair an air conditioner that is not cooling.", jurisdiction: "Nigeria" });
    expect(general.questions).toHaveLength(0);
    expect(repair.questions).toContain("What type of unit is this, such as split, window, central, portable or a heat pump?");
    expect(repair.questions).not.toContain("What symptom or fault code are you seeing?");
  });

  it("escalates electrical installation and requires qualified isolation", () => {
    const result = assessWorkRequest({
      trade: "electrical",
      task: "Install a new wall socket.",
    });
    expect(result.decision).toBe("escalate");
    expect(result.stopWork).toBe(true);
    expect(result.missingInformation).toContain("work jurisdiction");
    expect(result.questions).toContain("Has a qualified electrician isolated the supply and verified absence of voltage?");
  });

  it("escalates refrigerant charging and gives no DIY procedure", () => {
    const result = assessWorkRequest({
      trade: "hvac",
      task: "Recharge refrigerant in a split air conditioner.",
      jurisdiction: "Nigeria",
    });
    expect(result.detectedHazards).toContain("refrigerant-handling");
    expect(result.decision).toBe("escalate");
    expect(result.stopWork).toBe(true);
    expect(result.permittedGuidance[0]).toContain("Do not vent or handle refrigerant");
  });

  it("asks an unsure worker to identify the trade", () => {
    const result = assessWorkRequest({ trade: "unsure", task: "I need help fixing this." });
    expect(result.questions).toContain("Which trade best describes this task: carpentry, electrical, plumbing, HVAC, mechanical or construction?");
  });
});
