import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { join, dirname } from "node:path";
import type { ProgressState } from "./progress.js";

export interface SessionState {
  id: string;
  operation: string;
  status: "active" | "completed" | "failed" | "crashed";
  progress: ProgressState;
  context: Record<string, unknown>;  // Operation-specific data for resumption
  createdAt: string;
  updatedAt: string;
  crashedAt?: string;
}

/**
 * Persistent storage for session state (crash resumption).
 */
export class SessionStateStore {
  private readonly baseDir: string;

  constructor(basePath: string = process.cwd()) {
    this.baseDir = join(basePath, ".msw/sessions");
  }

  /**
   * Save session state to disk.
   */
  save(state: SessionState): void {
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
    }

    const filePath = this.getFilePath(state.id);
    writeFileSync(filePath, JSON.stringify(state, null, 2));
  }

  /**
   * Load session state from disk.
   */
  load(sessionId: string): SessionState | undefined {
    const filePath = this.getFilePath(sessionId);

    if (!existsSync(filePath)) {
      return undefined;
    }

    try {
      return JSON.parse(readFileSync(filePath, "utf-8")) as SessionState;
    } catch {
      return undefined;
    }
  }

  /**
   * Remove session state file.
   */
  remove(sessionId: string): boolean {
    const filePath = this.getFilePath(sessionId);

    if (!existsSync(filePath)) {
      return false;
    }

    try {
      unlinkSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all session IDs.
   */
  listSessions(): string[] {
    if (!existsSync(this.baseDir)) {
      return [];
    }

    return readdirSync(this.baseDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
  }

  /**
   * Find sessions that appear to have crashed (active but stale).
   */
  findCrashedSessions(staleThresholdMs: number = 60000): SessionState[] {
    const sessions: SessionState[] = [];
    const now = Date.now();

    for (const id of this.listSessions()) {
      const state = this.load(id);
      if (!state) continue;

      if (state.status === "active") {
        const updatedAt = new Date(state.updatedAt).getTime();
        if (now - updatedAt > staleThresholdMs) {
          sessions.push({
            ...state,
            status: "crashed",
            crashedAt: new Date().toISOString(),
          });
        }
      }
    }

    return sessions;
  }

  /**
   * Clean up old completed/failed sessions.
   */
  cleanup(maxAgeDays: number = 7): number {
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let removed = 0;

    for (const id of this.listSessions()) {
      const state = this.load(id);
      if (!state) continue;

      // Only clean up non-active sessions
      if (state.status !== "active") {
        const updatedAt = new Date(state.updatedAt).getTime();
        if (now - updatedAt > maxAgeMs) {
          if (this.remove(id)) {
            removed++;
          }
        }
      }
    }

    return removed;
  }

  private getFilePath(sessionId: string): string {
    return join(this.baseDir, `${sessionId}.json`);
  }
}
