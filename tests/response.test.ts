import { describe, expect, it, vi } from "vitest";
import { composeAssistantResponse, type IntelligenceProvider } from "../shared/src/response";

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
  trade: "plumbing",
  topic: "cartridge identification",
  retrievedAt: "2026-11-13T10:00:00.000Z",
  excerpt: "The cartridge assembly is shown in section 4.2. Use a 12 mm clearance tool.",
  pageOrSection: "4.2",
  reviewed: true,
}];
const provider = (generate: IntelligenceProvider["generate"]): IntelligenceProvider => ({ generate });

describe("provider-neutral grounded response pipeline", () => {
  it("does not call a provider when context or reviewed evidence is missing", async () => {
    const generate = vi.fn();
    const result = await composeAssistantResponse(request, [], provider(generate));
    expect(result.status).toBe("clarify");
    expect(generate).not.toHaveBeenCalled();
  });

  it("does not call a provider for a high-risk gas leak", async () => {
    const generate = vi.fn();
    const result = await composeAssistantResponse({
      trade: "plumbing",
      task: "I smell gas and suspect a gas leak.",
      jurisdiction: "Nigeria",
    }, [], provider(generate));
    expect(result.status).toBe("escalate");
    expect(result.blocks[0].content).toContain("avoid flames");
    expect(generate).not.toHaveBeenCalled();
  });

  it("accepts a provider draft only when every block cites reviewed applicable evidence", async () => {
    const generate = vi.fn().mockResolvedValue({
      summary: "The manual identifies the cartridge in section 4.2.",
      blocks: [{
        kind: "explanation",
        content: "The cartridge assembly is shown in section 4.2.",
        evidenceIds: ["manual-k100"],
      }],
      followUpQuestions: [],
    });
    const result = await composeAssistantResponse(request, evidence, provider(generate));
    expect(result.status).toBe("guided");
    expect(result.citations.map((citation) => citation.id)).toEqual(["manual-k100"]);
  });

  it("rejects a fabricated citation", async () => {
    const result = await composeAssistantResponse(request, evidence, provider(async () => ({
      summary: "Use the matching part.",
      blocks: [{ kind: "parts", content: "Use this cartridge.", evidenceIds: ["invented-source"] }],
    })));
    expect(result.status).toBe("unavailable");
    expect(result.blocks).toHaveLength(0);
  });

  it("rejects measurements not present in the cited source", async () => {
    const result = await composeAssistantResponse(request, evidence, provider(async () => ({
      summary: "Use the specified clearance.",
      blocks: [{
        kind: "measurement",
        content: "Use a 15 mm clearance tool.",
        evidenceIds: ["manual-k100"],
      }],
    })));
    expect(result.status).toBe("unavailable");
    expect(result.blocks).toHaveLength(0);
  });

  it("rejects dangerous instructions even when a source is cited", async () => {
    const result = await composeAssistantResponse(request, evidence, provider(async () => ({
      summary: "Adjust the machine.",
      blocks: [{
        kind: "procedure",
        content: "Disable the safety interlock before use.",
        evidenceIds: ["manual-k100"],
      }],
    })));
    expect(result.status).toBe("unavailable");
  });

  it("fails closed when the provider throws or no provider is configured", async () => {
    const failed = await composeAssistantResponse(request, evidence, provider(async () => {
      throw new Error("provider timeout");
    }));
    const unconfigured = await composeAssistantResponse(request, evidence);
    expect(failed.status).toBe("unavailable");
    expect(unconfigured.status).toBe("unavailable");
  });
});
