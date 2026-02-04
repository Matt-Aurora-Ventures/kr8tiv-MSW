import {
  performance,
  PerformanceObserver,
  type PerformanceEntry,
} from "node:perf_hooks";
import { calculateStats, type MetricStats } from "./stats.js";

export interface MetricEntry {
  name: string;
  duration: number;
  startTime: number;
  timestamp: string;
}

const MAX_ENTRIES = 10000; // Prevent memory leak

/**
 * Metrics collector using Node.js perf_hooks (HARD-05).
 * Non-blocking performance measurement.
 */
export class MetricsCollector {
  private entries: MetricEntry[] = [];
  private observer?: PerformanceObserver;
  private readonly maxEntries: number;

  constructor(maxEntries: number = MAX_ENTRIES) {
    this.maxEntries = maxEntries;
    this.setupObserver();
  }

  private setupObserver(): void {
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordEntry(entry);
      }
    });
    this.observer.observe({ entryTypes: ["measure"] });
  }

  private recordEntry(entry: PerformanceEntry): void {
    // Enforce max entries to prevent memory leak
    if (this.entries.length >= this.maxEntries) {
      // Remove oldest 10%
      const removeCount = Math.floor(this.maxEntries * 0.1);
      this.entries.splice(0, removeCount);
    }

    this.entries.push({
      name: entry.name,
      duration: entry.duration,
      startTime: entry.startTime,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Start a timing measurement.
   * @returns Mark name for use with endMeasure()
   */
  startMeasure(name: string): string {
    const markName = `${name}-start-${Date.now()}`;
    performance.mark(markName);
    return markName;
  }

  /**
   * End a timing measurement and record the duration.
   * @returns Duration in milliseconds
   */
  endMeasure(name: string, startMark: string): number {
    const endMark = `${name}-end-${Date.now()}`;
    performance.mark(endMark);

    try {
      const measure = performance.measure(name, startMark, endMark);
      return measure.duration;
    } finally {
      // Clean up marks
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
    }
  }

  /**
   * Convenience method to measure an async function.
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = this.startMeasure(name);
    try {
      return await fn();
    } finally {
      this.endMeasure(name, start);
    }
  }

  /**
   * Convenience method to measure a sync function.
   */
  measureSync<T>(name: string, fn: () => T): T {
    const start = this.startMeasure(name);
    try {
      return fn();
    } finally {
      this.endMeasure(name, start);
    }
  }

  /**
   * Get all entries for a specific metric name.
   */
  getEntries(name?: string): MetricEntry[] {
    if (!name) return [...this.entries];
    return this.entries.filter((e) => e.name === name);
  }

  /**
   * Get statistics for a specific metric.
   */
  getStats(name: string): MetricStats | undefined {
    const matching = this.entries.filter((e) => e.name === name);
    if (matching.length === 0) return undefined;

    const durations = matching.map((e) => e.duration);
    return calculateStats(name, durations);
  }

  /**
   * Get statistics for all metrics.
   */
  getAllStats(): Record<string, MetricStats> {
    const names = [...new Set(this.entries.map((e) => e.name))];
    const stats: Record<string, MetricStats> = {};

    for (const name of names) {
      const stat = this.getStats(name);
      if (stat) stats[name] = stat;
    }

    return stats;
  }

  /**
   * Get unique metric names.
   */
  getMetricNames(): string[] {
    return [...new Set(this.entries.map((e) => e.name))];
  }

  /**
   * Get entry count.
   */
  getEntryCount(): number {
    return this.entries.length;
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Close the collector and disconnect observer.
   */
  close(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
  }
}

// Singleton instance for global metrics
let globalCollector: MetricsCollector | undefined;

/**
 * Get the global metrics collector instance.
 */
export function getMetricsCollector(): MetricsCollector {
  if (!globalCollector) {
    globalCollector = new MetricsCollector();
  }
  return globalCollector;
}

/**
 * Helper to start a measurement using global collector.
 */
export function startMeasure(name: string): string {
  return getMetricsCollector().startMeasure(name);
}

/**
 * Helper to end a measurement using global collector.
 */
export function endMeasure(name: string, startMark: string): number {
  return getMetricsCollector().endMeasure(name, startMark);
}
