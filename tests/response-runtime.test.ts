import { describe, expect, it, vi } from "vitest";
import { composeWorkerAssistantResponse } from "../shared/src/response-runtime.js";

const assessment = {
  decision: "guided",
  trade: "plumbing",
  safetyLevel: "routine",
  compatibilityStatus: "undetermined",
  detectedHazards: [],
  stopWork: false,
  escalationRequired: false,
  missingInformation: [],
  questions: [],
  permittedGuidance: [],
  limitations: [],
  evidenceSources: [{
    id: "manual-k100",
    publisher: "Acme",
    title: "K-100 service manual",
    url: "https://example.com/manual",
    trade: "plumbing",
    topic: "cartridge identification",
    retrievedAt: "2026-11-15T08:00:00.000Z",
    excerpt: "The cartridge assembly is shown in section 4.2. Use a 12 mm clearance tool.",
    pageOrSection: "4.2",
    reviewed: true,
  }],
};
const request = {
  trade: "plumbing",
  task: "Identify the cartridge for my kitchen tap.",
  jurisdiction: "Nigeria",
  involvesEquipment: true,
  equipmentMake: "Acme",
  equipmentModel: "K-100",
  knownFacts: [],
  language: "en",
  units: "metric",
};
const goodDraft = {
  summary: "The reviewed K-100 manual contains a cartridge identification section.",
  blocks: [{
    kind: "explanation",
    content: "The cartridge assembly is shown in section 4.2.",
    evidenceIds: ["manual-k100"],
  }],
  followUpQuestions: [],
};

describe("Workers AI grounded response adapter", () => {
  it("never calls the model when the deterministic assessment requires clarification", async () => {
    const run = vi.fn();
    const result = await composeWorkerAssistantResponse({
      request,
      assessment: { ...assessment, decision: "clarify", evidenceSources: [], questions: ["Which model is this?"] },
      ai: { run },
    });
    expect(result.status).toBe("clarify");
    expect(run).not.toHaveBeenCalled();
  });

  it("never calls the model for a high-risk escalation", async () => {
    const run = vi.fn();
    const result = await composeWorkerAssistantResponse({
      request,
      assessment: {
        ...assessment,
        decision: "escalate",
        safetyLevel: "high-risk",
        stopWork: true,
        escalationRequired: true,
        detectedHazards: ["gas-leak"],
        permittedGuidance: ["Stop work and leave the affected area."],
      },
      ai: { run },
    });
    expect(result.status).toBe("escalate");
    expect(result.blocks[0].kind).toBe("safety");
    expect(run).not.toHaveBeenCalled();
  });

  it("returns a guided response only when model citations resolve to reviewed evidence", async () => {
    const run = vi.fn().mockResolvedValue({ response: JSON.stringify(goodDraft) });
    const result = await composeWorkerAssistantResponse({ request, assessment, ai: { run } });
    expect(result.status).toBe("guided");
    expect(result.citations.map(source => source.id)).toEqual(["manual-k100"]);
    expect(run).toHaveBeenCalledWith("@cf/zai-org/glm-4.7-flash", expect.objectContaining({
      response_format: { type: "json_object" },
      max_tokens: 1400,
    }));
  });

  it("rejects model-invented evidence IDs", async () => {
    const run = vi.fn().mockResolvedValue({
      response: JSON.stringify({
        ...goodDraft,
        blocks: [{ ...goodDraft.blocks[0], evidenceIds: ["invented-source"] }],
      }),
    });
    const result = await composeWorkerAssistantResponse({ request, assessment, ai: { run } });
    expect(result.status).toBe("unavailable");
    expect(result.blocks).toHaveLength(0);
    expect(result.citations).toHaveLength(0);
  });

  it("rejects measurements that are not present in cited evidence", async () => {
    const run = vi.fn().mockResolvedValue({
      response: JSON.stringify({
        ...goodDraft,
        blocks: [{ ...goodDraft.blocks[0], content: "Use a 20 mm clearance tool." }],
      }),
    });
    const result = await composeWorkerAssistantResponse({ request, assessment, ai: { run } });
    expect(result.status).toBe("unavailable");
  });

  it("rejects prohibited instructions even when a valid source ID is cited", async () => {
    const run = vi.fn().mockResolvedValue({
      response: JSON.stringify({
        ...goodDraft,
        blocks: [{ ...goodDraft.blocks[0], content: "Disable the safety interlock before servicing." }],
      }),
    });
    const result = await composeWorkerAssistantResponse({ request, assessment, ai: { run } });
    expect(result.status).toBe("unavailable");
  });

  it("fails closed when the model is unavailable", async () => {
    const run = vi.fn().mockRejectedValue(new Error("model unavailable"));
    const result = await composeWorkerAssistantResponse({ request, assessment, ai: { run } });
    expect(result.status).toBe("unavailable");
    expect(result.summary).toContain("could not be verified");
  });
});
