import type { QuotaUsage } from "./quota-tracker.js";

/**
 * Format usage status as a single-line string for logs/CLI.
 */
export function formatUsageStatus(usage: QuotaUsage): string {
  const bar = createProgressBar(usage.percentUsed, 20);
  const status = usage.isExhausted
    ? "EXHAUSTED"
    : usage.isWarning
      ? "WARNING"
      : "OK";

  return `[${bar}] ${usage.used}/${usage.limit} (${usage.remaining} remaining) [${status}]`;
}

/**
 * Display full usage dashboard to console (HARD-10).
 */
export function displayUsageDashboard(usage: QuotaUsage): void {
  const bar = createProgressBar(usage.percentUsed, 40);
  const resetDate = new Date(usage.resetTime);

  console.error(""); // Use stderr for MCP safety
  console.error("=== NotebookLM Quota Dashboard ===");
  console.error("");
  console.error(`  Requests Used:  ${usage.used}/${usage.limit}`);
  console.error(`  Remaining:      ${usage.remaining}`);
  console.error(`  Usage:          [${bar}] ${usage.percentUsed}%`);
  console.error(`  Resets At:      ${resetDate.toLocaleString()}`);
  console.error("");

  if (usage.isExhausted) {
    console.error("  STATUS: EXHAUSTED - Wait for reset or upgrade account");
  } else if (usage.isWarning) {
    console.error("  STATUS: WARNING - Consider batching remaining queries");
  } else {
    console.error("  STATUS: OK");
  }

  console.error("");
  console.error("=================================");
  console.error("");
}

/**
 * Create ASCII progress bar.
 */
function createProgressBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const fillChar = percent >= 80 ? "!" : "#";
  return fillChar.repeat(filled) + "-".repeat(empty);
}

/**
 * Format usage as JSON for structured output.
 */
export function formatUsageJson(usage: QuotaUsage): string {
  return JSON.stringify(usage, null, 2);
}
