import { clearChromeLock, detectChromeLock, isChromeRunning } from "./chrome-profile.js";
import { createSelectorReport, type SelectorDiagnostic } from "./selector-report.js";

export type FixType = "chrome-lock" | "selector" | "config";

export interface FixResult {
  type: FixType;
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export interface AutoFixerOptions {
  profilePath?: string;
  basePath?: string;
  autoFix?: boolean; // Default true
}

/**
 * Automatic remediation handler for common issues.
 */
export class AutoFixer {
  private readonly profilePath: string;
  private readonly basePath: string;
  private readonly autoFix: boolean;

  constructor(options: AutoFixerOptions = {}) {
    this.profilePath = options.profilePath || `${process.env.HOME || process.env.USERPROFILE}/.msw/chrome-profile`;
    this.basePath = options.basePath || process.cwd();
    this.autoFix = options.autoFix ?? true;
  }

  /**
   * Fix Chrome profile lock issues (HARD-13).
   */
  fixChromeLock(): FixResult {
    const detection = detectChromeLock(this.profilePath);

    if (!detection.isLocked) {
      return {
        type: "chrome-lock",
        success: true,
        message: "No Chrome lock issues detected",
      };
    }

    // Don't auto-fix if Chrome appears to be running
    if (isChromeRunning(this.profilePath)) {
      return {
        type: "chrome-lock",
        success: false,
        message: "Chrome appears to be running. Close Chrome and try again.",
        details: { locksFound: detection.locksFound },
      };
    }

    if (!this.autoFix) {
      return {
        type: "chrome-lock",
        success: false,
        message: `Lock files detected but auto-fix disabled: ${detection.locksFound.join(", ")}`,
        details: { locksFound: detection.locksFound },
      };
    }

    // Attempt auto-fix
    const clearResult = clearChromeLock(this.profilePath);

    if (clearResult.success) {
      return {
        type: "chrome-lock",
        success: true,
        message: `Auto-cleared lock files: ${clearResult.cleared.join(", ")}`,
        details: { cleared: clearResult.cleared },
      };
    }

    return {
      type: "chrome-lock",
      success: false,
      message: `Some locks could not be cleared: ${clearResult.failed.join(", ")}`,
      details: {
        cleared: clearResult.cleared,
        failed: clearResult.failed,
      },
    };
  }

  /**
   * Handle selector failure with diagnostic report (HARD-14).
   */
  handleSelectorFailure(
    selector: string,
    error: Error,
    pageHtml?: string,
    pageUrl?: string
  ): FixResult {
    const report = createSelectorReport(selector, error, {
      pageHtml,
      pageUrl,
      basePath: this.basePath,
    });

    return {
      type: "selector",
      success: false, // Selector failures require manual investigation
      message: `Selector failure reported. Diagnostic saved to ${report.reportPath}`,
      details: {
        selector,
        suggestions: report.suggestions,
        reportPath: report.reportPath,
      },
    };
  }

  /**
   * Run all fixes and return results.
   */
  runAllFixes(): FixResult[] {
    const results: FixResult[] = [];

    // Chrome lock fix
    results.push(this.fixChromeLock());

    return results;
  }
}
