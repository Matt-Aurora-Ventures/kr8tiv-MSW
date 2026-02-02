import * as fs from "node:fs";
import * as path from "node:path";
import { MswConfigSchema, type MswConfig } from "./schema.js";

export interface ValidationResult {
  success: boolean;
  data?: MswConfig;
  errors?: string[];
}

/**
 * Pure validation of raw config data against the MSW schema.
 */
export function validateConfig(raw: unknown): ValidationResult {
  const result = MswConfigSchema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map(
    (issue) => `${issue.path.join(".")}: ${issue.message}`
  );
  return { success: false, errors };
}

/**
 * Load and validate .msw/config.json from a project directory.
 * Throws on missing file or invalid config.
 */
export function loadConfig(projectDir: string): MswConfig {
  const configPath = path.join(projectDir, ".msw", "config.json");

  if (!fs.existsSync(configPath)) {
    throw new Error(
      `MSW config not found at ${configPath}. Run 'msw init' first.`
    );
  }

  const raw = JSON.parse(fs.readFileSync(configPath, "utf-8")) as unknown;
  const result = validateConfig(raw);

  if (!result.success) {
    throw new Error(
      `Invalid MSW config:\n  - ${result.errors!.join("\n  - ")}`
    );
  }

  return result.data!;
}
