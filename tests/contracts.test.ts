import { describe, expect, it } from "vitest";
import {
  languageSchema,
  tradeSchema,
  unitSystemSchema,
  workerPreferencesSchema,
} from "../shared/src/contracts";

describe("shared worker preference contracts", () => {
  it("accepts every supported trade category", () => {
    for (const trade of ["carpentry", "electrical", "plumbing", "hvac", "mechanical", "construction", "multiple", "unsure"]) {
      expect(tradeSchema.safeParse(trade).success).toBe(true);
    }
  });

  it("accepts the four initial language options", () => {
    for (const language of ["en", "en-ng", "pcm-ng", "fr"]) {
      expect(languageSchema.safeParse(language).success).toBe(true);
    }
  });

  it("accepts metric and imperial units", () => {
    expect(unitSystemSchema.safeParse("metric").success).toBe(true);
    expect(unitSystemSchema.safeParse("imperial").success).toBe(true);
  });

  it("rejects unsupported values instead of silently coercing them", () => {
    expect(tradeSchema.safeParse("general-repair").success).toBe(false);
    expect(languageSchema.safeParse("pidgin").success).toBe(false);
    expect(unitSystemSchema.safeParse("whatever").success).toBe(false);
  });

  it("validates a complete worker preference object", () => {
    expect(workerPreferencesSchema.parse({
      trade: "plumbing",
      language: "pcm-ng",
      units: "metric",
    })).toEqual({ trade: "plumbing", language: "pcm-ng", units: "metric" });
  });
});
