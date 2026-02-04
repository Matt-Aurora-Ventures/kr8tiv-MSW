import { existsSync } from "node:fs";
import { AutoFixer, type FixResult } from "./auto-fixer.js";
import { detectChromeLock } from "./chrome-profile.js";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface HealthCheckResult {
  status: HealthStatus;
  checks: HealthCheck[];
  fixes: FixResult[];
  canProceed: boolean;
}

export interface HealthCheck {
  name: string;
  passed: boolean;
  message: string;
}

export interface HealthCheckOptions {
  profilePath?: string;
  configPath?: string;
  autoFix?: boolean;
}

/**
 * Run pre-launch health checks with optional auto-fix.
 */
export async function runHealthCheck(
  options: HealthCheckOptions = {}
): Promise<HealthCheckResult> {
  const profilePath = options.profilePath || `${process.env.HOME || process.env.USERPROFILE}/.msw/chrome-profile`;
  const configPath = options.configPath || `${process.cwd()}/.msw/config.yaml`;
  const autoFix = options.autoFix ?? true;

  const checks: HealthCheck[] = [];
  const fixes: FixResult[] = [];

  // Check 1: Configuration exists
  const configExists = existsSync(configPath);
  checks.push({
    name: "Configuration",
    passed: configExists,
    message: configExists
      ? "Configuration file found"
      : "No configuration file. Run `msw setup` first.",
  });

  // Check 2: Profile directory exists
  const profileExists = existsSync(profilePath);
  checks.push({
    name: "Profile Directory",
    passed: profileExists,
    message: profileExists
      ? "Chrome profile directory exists"
      : "Profile directory will be created on first launch",
  });

  // Check 3: No Chrome lock (with auto-fix)
  const lockDetection = detectChromeLock(profilePath);
  let lockCheckPassed = !lockDetection.isLocked;

  if (lockDetection.isLocked && autoFix) {
    const fixer = new AutoFixer({ profilePath, autoFix: true });
    const fixResult = fixer.fixChromeLock();
    fixes.push(fixResult);
    lockCheckPassed = fixResult.success;
  }

  checks.push({
    name: "Chrome Profile Lock",
    passed: lockCheckPassed,
    message: lockCheckPassed
      ? "No profile locks detected"
      : `Lock files present: ${lockDetection.locksFound.join(", ")}`,
  });

  // Check 4: .msw directory writable
  const mswDir = `${process.cwd()}/.msw`;
  const mswDirExists = existsSync(mswDir);
  checks.push({
    name: "MSW Directory",
    passed: true, // Will be created if needed
    message: mswDirExists
      ? ".msw directory exists"
      : ".msw directory will be created",
  });

  // Determine overall status
  const failedCritical = checks.some(
    (c) => !c.passed && (c.name === "Configuration" || c.name === "Chrome Profile Lock")
  );

  const status: HealthStatus = failedCritical
    ? "unhealthy"
    : checks.every((c) => c.passed)
    ? "healthy"
    : "degraded";

  return {
    status,
    checks,
    fixes,
    canProceed: status !== "unhealthy",
  };
}

/**
 * Format health check result for display.
 */
export function formatHealthCheck(result: HealthCheckResult): string {
  const statusEmoji = {
    healthy: "[OK]",
    degraded: "[WARN]",
    unhealthy: "[FAIL]",
  };

  let output = `
=== MSW Health Check ===
Status: ${statusEmoji[result.status]} ${result.status.toUpperCase()}

Checks:
`;

  for (const check of result.checks) {
    const checkMark = check.passed ? "[+]" : "[-]";
    output += `  ${checkMark} ${check.name}: ${check.message}\n`;
  }

  if (result.fixes.length > 0) {
    output += "\nAuto-Fixes Applied:\n";
    for (const fix of result.fixes) {
      const fixMark = fix.success ? "[+]" : "[-]";
      output += `  ${fixMark} ${fix.type}: ${fix.message}\n`;
    }
  }

  output += `
Can Proceed: ${result.canProceed ? "Yes" : "No"}
`;

  return output;
}
