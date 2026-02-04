import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

export interface SelectorDiagnostic {
  timestamp: string;
  failedSelector: string;
  error: string;
  suggestions: string[];
  htmlSnapshot?: string;
  pageUrl?: string;
  reportPath: string;
}

/**
 * Create diagnostic report for selector failure (HARD-14).
 */
export function createSelectorReport(
  selector: string,
  error: Error,
  options: {
    pageHtml?: string;
    pageUrl?: string;
    basePath?: string;
  } = {}
): SelectorDiagnostic {
  const basePath = options.basePath || process.cwd();
  const timestamp = new Date().toISOString();
  const reportId = `selector-${Date.now()}`;
  const reportPath = join(basePath, `.msw/diagnostics/${reportId}.json`);

  const report: SelectorDiagnostic = {
    timestamp,
    failedSelector: selector,
    error: error.message,
    suggestions: analyzeSelector(selector),
    htmlSnapshot: options.pageHtml?.substring(0, 10000), // First 10KB
    pageUrl: options.pageUrl,
    reportPath,
  };

  // Ensure directory exists
  const dir = dirname(reportPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Write report
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return report;
}

/**
 * Analyze selector and suggest alternatives (HARD-14).
 */
function analyzeSelector(selector: string): string[] {
  const suggestions: string[] = [];

  // aria-label selectors
  if (selector.includes("aria-label")) {
    suggestions.push(
      "aria-label may have changed - check NotebookLM UI for updated labels"
    );
    suggestions.push(
      "Try using role-based selector: [role='button'], [role='textbox']"
    );
  }

  // data-* attribute selectors
  if (selector.includes("data-")) {
    suggestions.push(
      "data-* attributes may be dynamically generated - use more stable selector"
    );
    suggestions.push(
      "Consider text content selector: text='Submit' or :has-text('Submit')"
    );
  }

  // CSS class selectors (likely to break)
  if (selector.includes("class=") || selector.match(/\.[a-z]+-[a-zA-Z0-9]+/)) {
    suggestions.push(
      "CSS class selectors are brittle - NotebookLM uses generated class names"
    );
    suggestions.push(
      "Prefer semantic selectors: role, aria-label, text content"
    );
  }

  // ID selectors
  if (selector.startsWith("#") || selector.includes("id=")) {
    suggestions.push(
      "ID selectors may be stable - verify ID hasn't changed"
    );
  }

  // XPath selectors
  if (selector.startsWith("//") || selector.startsWith("xpath=")) {
    suggestions.push(
      "XPath selectors can be fragile - consider CSS alternatives"
    );
  }

  // Generic timeout suggestions
  suggestions.push(
    "Increase timeout if element loads asynchronously"
  );
  suggestions.push(
    "Check if element is inside iframe or shadow DOM"
  );

  return suggestions;
}

/**
 * Format selector report for human-readable display.
 */
export function formatSelectorReport(report: SelectorDiagnostic): string {
  let output = `
=== Selector Diagnostic Report ===
Time: ${report.timestamp}
Selector: ${report.failedSelector}
Error: ${report.error}
${report.pageUrl ? `URL: ${report.pageUrl}` : ""}

Suggestions:
`;

  for (const suggestion of report.suggestions) {
    output += `  - ${suggestion}\n`;
  }

  output += `
Report saved to: ${report.reportPath}
`;

  return output;
}
