import { execSync } from "node:child_process";

export interface HealthCheck {
  component: string;
  healthy: boolean;
  degraded?: string;
}

/**
 * Check health of all MSW subsystems.
 * Each check is independent; failures in one do not block others.
 */
export async function checkHealth(): Promise<HealthCheck[]> {
  const checks = await Promise.all([
    checkBrowser(),
    checkGit(),
  ]);
  return checks;
}

async function checkBrowser(): Promise<HealthCheck> {
  try {
    // Verify playwright is importable
    await import("playwright");
    return { component: "browser", healthy: true };
  } catch {
    return {
      component: "browser",
      healthy: false,
      degraded:
        "Playwright not available. NotebookLM interaction will not work.",
    };
  }
}

async function checkGit(): Promise<HealthCheck> {
  try {
    execSync("git --version", { stdio: "pipe" });
    return { component: "git", healthy: true };
  } catch {
    return {
      component: "git",
      healthy: false,
      degraded: "Git not found. Knowledge graph git-based tracking unavailable.",
    };
  }
}
