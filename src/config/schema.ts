import { z } from "zod";

/**
 * Zod schema for MSW project configuration (.msw/config.json).
 */
export const MswConfigSchema = z.object({
  notebookUrl: z.string().url("notebookUrl must be a valid URL"),
  profileDir: z.string().optional(),
  relevanceThreshold: z
    .number()
    .min(0, "relevanceThreshold must be >= 0")
    .max(100, "relevanceThreshold must be <= 100")
    .default(30),
  maxDepth: z
    .number()
    .min(1, "maxDepth must be >= 1")
    .max(10, "maxDepth must be <= 10")
    .default(5),
  maxQueriesPerDay: z.number().int().positive().default(50),
  version: z.string().optional(),
});

/** Validated MSW configuration type. */
export type MswConfig = z.infer<typeof MswConfigSchema>;
