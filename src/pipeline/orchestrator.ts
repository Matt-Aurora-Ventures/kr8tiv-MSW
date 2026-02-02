import { loadConfig } from "../config/validator.js";
import { checkHealth, type HealthCheck } from "./health.js";
import {
  saveCheckpoint,
  restoreCheckpoint,
  clearCheckpoint,
  type PipelineState,
} from "./state.js";
import type { MswConfig } from "../config/schema.js";

export interface InitResult {
  config: MswConfig;
  health: HealthCheck[];
  state: PipelineState;
  resumed: boolean;
}

/**
 * Central pipeline coordinator.
 *
 * Lifecycle: validate config -> check health -> restore state (if crashed) -> run -> checkpoint -> complete.
 * Health check failures produce degraded mode rather than blocking startup.
 */
export class PipelineOrchestrator {
  private projectDir: string;
  private healthCache: HealthCheck[] = [];

  constructor(projectDir: string) {
    this.projectDir = projectDir;
  }

  /**
   * Validate config, run health checks, and attempt state restore.
   * Throws if config is missing or invalid.
   * Health failures do NOT throw -- they degrade gracefully.
   */
  async initialize(): Promise<InitResult> {
    // 1. Config validation (throws on failure)
    const config = loadConfig(this.projectDir);

    // 2. Health checks (never throws)
    this.healthCache = await checkHealth();

    // 3. State restore
    const existing = restoreCheckpoint(this.projectDir);

    if (existing && existing.phase !== "idle") {
      console.error("[msw] Resuming from previous session checkpoint");
      return { config, health: this.healthCache, state: existing, resumed: true };
    }

    const fresh: PipelineState = {
      sessionId: crypto.randomUUID(),
      phase: "idle",
      pendingQueries: [],
      completedQA: [],
      lastCheckpoint: new Date().toISOString(),
    };

    return { config, health: this.healthCache, state: fresh, resumed: false };
  }

  /** Persist current pipeline state to disk. */
  async checkpoint(state: PipelineState): Promise<void> {
    saveCheckpoint(this.projectDir, state);
  }

  /** Clear state file after successful pipeline completion. */
  async complete(): Promise<void> {
    clearCheckpoint(this.projectDir);
  }

  /** Return cached health check results (call after initialize). */
  getHealth(): HealthCheck[] {
    return this.healthCache;
  }

  /** Return descriptions of unavailable capabilities based on health. */
  getDegradedCapabilities(): string[] {
    return this.healthCache
      .filter((c) => !c.healthy && c.degraded)
      .map((c) => c.degraded!);
  }
}
