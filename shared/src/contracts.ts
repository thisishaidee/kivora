import { z } from "zod";

export const tradeSchema = z.enum([
  "carpentry",
  "electrical",
  "plumbing",
  "hvac",
  "mechanical",
  "construction",
  "multiple",
  "unsure",
]);
export type Trade = z.infer<typeof tradeSchema>;

export const languageSchema = z.enum([
  "en",
  "en-ng",
  "pcm-ng",
  "fr",
]);
export type Language = z.infer<typeof languageSchema>;

export const unitSystemSchema = z.enum(["metric", "imperial"]);
export type UnitSystem = z.infer<typeof unitSystemSchema>;

export const workerPreferencesSchema = z.object({
  trade: tradeSchema,
  language: languageSchema,
  units: unitSystemSchema,
});
export type WorkerPreferences = z.infer<typeof workerPreferencesSchema>;

export const healthResponseSchema = z.object({
  service: z.literal("kivora-api"),
  status: z.literal("ok"),
  version: z.string(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
