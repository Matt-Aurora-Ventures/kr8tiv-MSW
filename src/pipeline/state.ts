import * as fs from "node:fs";
import * as path from "node:path";

export interface PipelineState {
  sessionId: string;
  phase: string;
  pendingQueries: string[];
  completedQA: Array<{ question: string; answer: string }>;
  lastCheckpoint: string; // ISO timestamp
}

const STATE_FILE = "state.json";

function statePath(projectDir: string): string {
  return path.join(projectDir, ".msw", STATE_FILE);
}

/**
 * Atomically persist pipeline state to .msw/state.json.
 * Writes to a temp file first, then renames for crash safety.
 */
export function saveCheckpoint(
  projectDir: string,
  state: PipelineState
): void {
  const target = statePath(projectDir);
  const dir = path.dirname(target);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tmp = target + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
  fs.renameSync(tmp, target);
}

/**
 * Restore pipeline state from .msw/state.json.
 * Returns null if no checkpoint exists.
 */
export function restoreCheckpoint(projectDir: string): PipelineState | null {
  const target = statePath(projectDir);
  if (!fs.existsSync(target)) {
    return null;
  }
  const raw = fs.readFileSync(target, "utf-8");
  return JSON.parse(raw) as PipelineState;
}

/**
 * Remove the state file after successful pipeline completion.
 */
export function clearCheckpoint(projectDir: string): void {
  const target = statePath(projectDir);
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
}
