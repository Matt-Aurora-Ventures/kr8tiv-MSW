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
    checkOllama(),
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

async function checkOllama(): Promise<HealthCheck> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const response = await fetch("http://localhost:11434/api/tags", {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (response.ok) {
      return { component: "ollama", healthy: true };
    }
    return {
      component: "ollama",
      healthy: false,
      degraded: `Ollama returned status ${response.status}. Local relevance scoring unavailable.`,
    };
  } catch {
    return {
      component: "ollama",
      healthy: false,
      degraded:
        "Ollama not reachable at localhost:11434. Local relevance scoring unavailable.",
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
