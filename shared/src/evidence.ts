import { z } from "zod";
import { tradeSchema } from "./contracts";

export const privateEvidenceCaptureSchema = z.object({
  trade: tradeSchema,
  sourceType: z.enum(["manufacturer_manual","technical_bulletin","service_notice","standard","field_observation","other"]),
  publisher: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(300),
  sourceUrl: z.string().url().refine((value) => value.startsWith("https://"), "Only HTTPS source links are accepted").optional(),
  documentRef: z.string().trim().max(200).optional(),
  sourceVersion: z.string().trim().max(120).optional(),
  revisionDate: z.string().trim().max(40).optional(),
  jurisdiction: z.string().trim().max(120).optional(),
  language: z.enum(["en","en-ng","pcm-ng","fr","und"]).default("und"),
  productMake: z.string().trim().max(120).optional(),
  productModel: z.string().trim().max(120).optional(),
  topic: z.string().trim().min(1).max(200),
  pageOrSection: z.string().trim().max(120).optional(),
  evidenceNote: z.string().trim().min(1).max(2000),
  sourceSha256: z.string().regex(/^[0-9a-f]{64}$/i).optional(),
}).strict();

export type PrivateEvidenceCapture = z.infer<typeof privateEvidenceCaptureSchema>;
