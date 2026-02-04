import { writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { MetricsCollector, getMetricsCollector } from "./collector.js";
import type { MetricStats } from "./stats.js";
import type { MetricEntry } from "./collector.js";

export interface MetricsExport {
  exportedAt: string;
  totalEntries: number;
  metrics: string[];
  entries: MetricEntry[];
  statistics: Record<string, MetricStats>;
}

/**
 * Export metrics to JSON file (HARD-05).
 */
export function exportMetrics(
  collector?: MetricsCollector,
  outputPath?: string
): string {
  const metricsCollector = collector || getMetricsCollector();
  const basePath = process.cwd();
  const metricsDir = join(basePath, ".msw");
  const filePath = outputPath || join(metricsDir, `metrics-${Date.now()}.json`);

  // Ensure directory exists
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const exportData: MetricsExport = {
    exportedAt: new Date().toISOString(),
    totalEntries: metricsCollector.getEntryCount(),
    metrics: metricsCollector.getMetricNames(),
    entries: metricsCollector.getEntries(),
    statistics: metricsCollector.getAllStats(),
  };

  writeFileSync(filePath, JSON.stringify(exportData, null, 2));
  return filePath;
}

/**
 * Export metrics and clear the collector.
 */
export function exportAndClear(
  collector?: MetricsCollector,
  outputPath?: string
): string {
  const filePath = exportMetrics(collector, outputPath);
  const metricsCollector = collector || getMetricsCollector();
  metricsCollector.clear();
  return filePath;
}

/**
 * Prune old metrics files, keeping only the last N files.
 */
export function pruneMetricsFiles(
  keepCount: number = 7,
  basePath: string = process.cwd()
): number {
  const metricsDir = join(basePath, ".msw");

  if (!existsSync(metricsDir)) {
    return 0;
  }

  // Find all metrics files
  const files = readdirSync(metricsDir)
    .filter((f) => f.startsWith("metrics-") && f.endsWith(".json"))
    .sort()
    .reverse(); // Newest first

  // Remove files beyond keepCount
  const toRemove = files.slice(keepCount);
  let removed = 0;

  for (const file of toRemove) {
    try {
      unlinkSync(join(metricsDir, file));
      removed++;
    } catch {
      // Ignore removal errors
    }
  }

  return removed;
}

/**
 * Get list of existing metrics export files.
 */
export function listMetricsFiles(basePath: string = process.cwd()): string[] {
  const metricsDir = join(basePath, ".msw");

  if (!existsSync(metricsDir)) {
    return [];
  }

  return readdirSync(metricsDir)
    .filter((f) => f.startsWith("metrics-") && f.endsWith(".json"))
    .map((f) => join(metricsDir, f))
    .sort()
    .reverse(); // Newest first
}
