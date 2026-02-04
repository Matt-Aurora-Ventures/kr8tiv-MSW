export interface MetricStats {
  name: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  sum: number;
  p50: number;
  p90: number;
  p95: number;
  p99: number;
  stdDev: number;
}

/**
 * Calculate percentile from sorted array.
 */
export function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const index = Math.ceil((p / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
}

/**
 * Calculate standard deviation.
 */
export function standardDeviation(values: number[], avg: number): number {
  if (values.length <= 1) return 0;

  const squaredDiffs = values.map((v) => Math.pow(v - avg, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Calculate comprehensive statistics for a set of metric values.
 */
export function calculateStats(name: string, values: number[]): MetricStats {
  if (values.length === 0) {
    return {
      name,
      count: 0,
      min: 0,
      max: 0,
      avg: 0,
      sum: 0,
      p50: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      stdDev: 0,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;

  return {
    name,
    count: values.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round(avg * 100) / 100, // Round to 2 decimals
    sum: Math.round(sum * 100) / 100,
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    stdDev: Math.round(standardDeviation(values, avg) * 100) / 100,
  };
}

/**
 * Format stats for human-readable display.
 */
export function formatStats(stats: MetricStats): string {
  return `
${stats.name} (${stats.count} samples):
  Min: ${stats.min.toFixed(2)}ms
  Max: ${stats.max.toFixed(2)}ms
  Avg: ${stats.avg.toFixed(2)}ms
  P50: ${stats.p50.toFixed(2)}ms
  P95: ${stats.p95.toFixed(2)}ms
  P99: ${stats.p99.toFixed(2)}ms
  StdDev: ${stats.stdDev.toFixed(2)}ms
`;
}
