import { z } from "zod";
import {
  assessWorkRequest,
  type EvidenceSource,
  type IntelligenceAssessment,
  type WorkRequest,
} from "./intelligence";
import { evidenceSourceSchema, workRequestSchema } from "./intelligence";

export const responseBlockSchema = z.object({
  kind: z.enum(["safety", "explanation", "procedure", "measurement", "parts"]),
  content: z.string().trim().min(1).max(1800),
  evidenceIds: z.array(z.string().min(1).max(120)).max(10),
});
export type ResponseBlock = z.infer<typeof responseBlockSchema>;

const providerBlockSchema = z.object({
  kind: z.enum(["explanation", "procedure", "measurement", "parts"]),
  content: z.string().trim().min(1).max(1800),
  evidenceIds: z.array(z.string().min(1).max(120)).min(1).max(10),
});

export const providerDraftSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  blocks: z.array(providerBlockSchema).min(1).max(12),
  followUpQuestions: z.array(z.string().trim().min(1).max(300)).max(8).default([]),
});
export type ProviderDraft = z.infer<typeof providerDraftSchema>;

export const assistantResponseSchema = z.object({
  status: z.enum(["clarify", "escalate", "guided", "unavailable"]),
  summary: z.string(),
  blocks: z.array(responseBlockSchema),
  questions: z.array(z.string()),
  citations: z.array(z.object({
    id: z.string(),
    publisher: z.string(),
    title: z.string(),
    url: z.string().optional(),
    documentId: z.string().optional(),
    pageOrSection: z.string().optional(),
  })),
  compatibilityStatus: z.enum(["compatible", "incompatible", "undetermined"]),
  safetyLevel: z.enum(["routine", "caution", "high-risk"]),
});
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;

export type ProviderInput = {
  request: WorkRequest;
  assessment: IntelligenceAssessment;
  evidence: EvidenceSource[];
};

export interface IntelligenceProvider {
  generate(input: ProviderInput): Promise<unknown>;
}

const MEASUREMENT_PATTERN = /\b\d+(?:[.,]\d+)?\s?(?:mm|cm|m|in|ft|°c|°f|v|a|w|kw|bar|psi|nm|kg|g|l|ml)\b/gi;
const UNSAFE_INSTRUCTION_PATTERN = /\b(?:bypass|disable|defeat)\s+(?:the\s+)?(?:safety|interlock|guard|breaker)|\bwork\s+on\s+(?:a\s+)?live\s+(?:wire|circuit)|\bremove\s+(?:the\s+)?(?:machine\s+)?guard\s+while\s+running|\bvent\s+(?:the\s+)?refrigerant|\bopen\s+(?:a\s+)?pressur(?:ised|ized)\s+(?:system|vessel)\b/i;

const emptyResponse = (
  status: AssistantResponse["status"],
  summary: string,
  assessment: IntelligenceAssessment,
  questions: string[] = [],
  blocks: ResponseBlock[] = [],
  citations: AssistantResponse["citations"] = [],
): AssistantResponse => assistantResponseSchema.parse({
  status,
  summary,
  blocks,
  questions,
  citations,
  compatibilityStatus: assessment.compatibilityStatus,
  safetyLevel: assessment.safetyLevel,
});

const publicCitation = (source: EvidenceSource) => ({
  id: source.id,
  publisher: source.publisher,
  title: source.title,
  ...(source.url ? { url: source.url } : {}),
  ...(source.documentId ? { documentId: source.documentId } : {}),
  ...(source.pageOrSection ? { pageOrSection: source.pageOrSection } : {}),
});

function validateDraft(
  draftInput: unknown,
  evidence: EvidenceSource[],
): { draft: ProviderDraft; citations: AssistantResponse["citations"] } {
  const draft = providerDraftSchema.parse(draftInput);
  if (UNSAFE_INSTRUCTION_PATTERN.test([draft.summary, ...draft.followUpQuestions].join("\\n"))) {
    throw new Error("unsafe_instruction");
  }
  const sourceById = new Map(evidence.map((source) => [source.id, source]));
  const citedIds = new Set<string>();

  for (const block of draft.blocks) {
    const citedSources = block.evidenceIds.map((id) => {
      const source = sourceById.get(id);
      if (!source || !source.reviewed) throw new Error("unsupported_citation");
      citedIds.add(id);
      return source;
    });

    const measurements = block.content.match(MEASUREMENT_PATTERN) ?? [];
    for (const measurement of measurements) {
      const normalized = measurement.toLowerCase().replace(/\s+/g, "");
      const supported = citedSources.some((source) =>
        (source.excerpt.match(MEASUREMENT_PATTERN) ?? [])
          .some((value) => value.toLowerCase().replace(/\s+/g, "") === normalized),
      );
      if (!supported) throw new Error("unsupported_measurement");
    }

    if (UNSAFE_INSTRUCTION_PATTERN.test(block.content)) {
      throw new Error("unsafe_instruction");
    }
  }

  const nonBlockText = [draft.summary, ...draft.followUpQuestions];
  for (const text of nonBlockText) {
    const measurements = text.match(MEASUREMENT_PATTERN) ?? [];
    for (const measurement of measurements) {
      const normalized = measurement.toLowerCase().replace(/\s+/g, "");
      const supported = [...citedIds].some((id) => {
        const source = sourceById.get(id);
        return !!source && (source.excerpt.match(MEASUREMENT_PATTERN) ?? [])
          .some((value) => value.toLowerCase().replace(/\s+/g, "") === normalized);
      });
      if (!supported) throw new Error("unsupported_measurement");
    }
  }

  const citations = [...citedIds].map((id) => {
    const source = sourceById.get(id);
    if (!source) throw new Error("unsupported_citation");
    return publicCitation(source);
  });

  return { draft, citations };
}

/**
 * Orchestrates a provider-neutral response.
 * High-risk and clarification decisions never call the model.
 * Model output is accepted only when its citations resolve to reviewed evidence.
 */
export async function composeAssistantResponse(
  requestInput: unknown,
  evidenceInput: unknown = [],
  provider?: IntelligenceProvider,
): Promise<AssistantResponse> {
  const request = workRequestSchema.parse(requestInput);
  const evidence = z.array(evidenceSourceSchema).max(100).parse(evidenceInput);
  const assessment = assessWorkRequest(request, evidence);

  if (assessment.decision === "escalate") {
    return emptyResponse(
      "escalate",
      "Stop the task where indicated and get help from a qualified professional. Do not use this assessment as permission to continue.",
      assessment,
      assessment.questions,
      assessment.permittedGuidance.map((content) => ({
        kind: "safety" as const,
        content,
        evidenceIds: [],
      })),
    );
  }

  if (assessment.decision === "clarify") {
    return emptyResponse(
      "clarify",
      "More context or reviewed, applicable evidence is required before technical guidance can be provided.",
      assessment,
      assessment.questions.length > 0
        ? assessment.questions
        : assessment.missingInformation.map((item) => `Please provide ${item}.`),
    );
  }

  if (!provider) {
    return emptyResponse(
      "unavailable",
      "The evidence checks passed, but no AI response provider is configured. No technical procedure was generated.",
      assessment,
    );
  }

  try {
    const providerOutput = await provider.generate({
      request,
      assessment,
      evidence: assessment.evidenceSources,
    });
    const { draft, citations } = validateDraft(providerOutput, assessment.evidenceSources);
    return emptyResponse(
      "guided",
      draft.summary,
      assessment,
      draft.followUpQuestions,
      draft.blocks,
      citations,
    );
  } catch {
    return emptyResponse(
      "unavailable",
      "A response could not be verified against the approved evidence. No technical guidance was returned.",
      assessment,
    );
  }
}
