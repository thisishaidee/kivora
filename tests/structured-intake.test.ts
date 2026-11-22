import { describe, expect, it } from "vitest";
import { assessWorkRequest } from "../shared/src/intelligence";



describe("structured worker context", () => {
  it("includes worker-provided context in deterministic hazard screening", () => {
    const result = assessWorkRequest({
      trade: "plumbing",
      task: "I am checking a fitting under the kitchen sink.",
      knownFacts: ["I can smell gas near the appliance."],
    });
    expect(result.decision).toBe("escalate");
    expect(result.stopWork).toBe(true);
    expect(result.detectedHazards).toContain("gas-leak");
  });

  it("accepts practical measurements, materials, tools and constraints as bounded facts", () => {
    const result = assessWorkRequest({
      trade: "carpentry",
      task: "I need to cut and assemble a cabinet door.",
      knownFacts: [
        "Measurements: 600 mm by 450 mm",
        "Materials: 18 mm MDF",
        "Available tools: circular saw and clamps",
        "Constraints: limited workshop space",
      ],
    });
    expect(result.questions).not.toContain("What material or board type are you working with, such as solid timber, plywood or MDF?");
    expect(result.questions).not.toContain("What are the required dimensions and material thickness?");
  });
});
