// Barrel export for diagnostics module
export {
  detectChromeLock,
  clearChromeLock,
  isChromeRunning,
  getLockMessage,
  type LockDetectionResult,
  type LockClearResult,
} from "./chrome-profile.js";

export {
  createSelectorReport,
  formatSelectorReport,
  type SelectorDiagnostic,
} from "./selector-report.js";

export {
  AutoFixer,
  type FixResult,
  type FixType,
  type AutoFixerOptions,
} from "./auto-fixer.js";

export {
  runHealthCheck,
  formatHealthCheck,
  type HealthCheckResult,
  type HealthCheck,
  type HealthStatus,
  type HealthCheckOptions,
} from "./health-checker.js";
