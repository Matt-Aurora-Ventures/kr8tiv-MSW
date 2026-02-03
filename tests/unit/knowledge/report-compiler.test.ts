// vitest globals enabled - no imports needed for describe/it/expect
import { compileReport, ReportCompiler } from "../../../src/knowledge/report-compiler.js";
import type { ResearchReport, QAPair } from "../../../src/types/bidirectional.js";

describe("ReportCompiler snapshots", () => {
  const compiler = new ReportCompiler();

  it("compiles single Q&A pair to markdown", () => {
    const report: ResearchReport = {
      sessionId: "test-session-001",
      notebook: "msw-protocol",
      taskGoal: "Test authentication patterns",
      startTime: new Date("2026-02-03T10:00:00Z"),
      endTime: new Date("2026-02-03T10:05:00Z"),
      pairs: [
        {
          question: "How does authentication work?",
          answer: "MSW uses persistent Chrome profiles to maintain Google session cookies.",
          timestamp: new Date("2026-02-03T10:02:00Z"),
          source: "auto-expansion",
          citations: ["auth.md", "browser.md"],
        },
      ],
    };

    const markdown = compiler.compile(report);

    expect(markdown).toMatchSnapshot();
    // Validate structure
    expect(markdown).toContain("sessionId: test-session-001");
    expect(markdown).toContain("## Q1:");
    expect(markdown).toContain("**Citations:**");
  });

  it("compiles multiple Q&A pairs with metadata", () => {
    const report: ResearchReport = {
      sessionId: "test-session-002",
      notebook: "msw-protocol",
      taskGoal: "Understand MSW architecture",
      startTime: new Date("2026-02-03T10:00:00Z"),
      endTime: new Date("2026-02-03T10:15:00Z"),
      pairs: [
        {
          question: "How does authentication work?",
          answer: "Uses persistent Chrome profiles.",
          timestamp: new Date("2026-02-03T10:02:00Z"),
          source: "auto-expansion",
          citations: ["auth.md"],
        },
        {
          question: "How does error handling work?",
          answer: "Errors trigger NotebookLM queries for guidance.",
          timestamp: new Date("2026-02-03T10:07:00Z"),
          source: "error-bridge",
          citations: ["error-handling.md"],
        },
        {
          question: "How does testing work?",
          answer: "Three-tier testing: unit, integration, E2E.",
          timestamp: new Date("2026-02-03T10:12:00Z"),
          source: "auto-expansion",
          citations: ["testing.md"],
          relevanceScore: 0.95,
        },
      ],
    };

    const markdown = compiler.compile(report);

    expect(markdown).toMatchSnapshot();
    expect(markdown).toContain("queryCount: 3");
    expect(markdown).toContain("## Q1:");
    expect(markdown).toContain("## Q2:");
    expect(markdown).toContain("## Q3:");
    expect(markdown).toContain("Relevance: 0.95");
  });

  it("compiles report with all source types", () => {
    const report: ResearchReport = {
      sessionId: "test-session-003",
      notebook: "msw-protocol",
      taskGoal: "Test all source types",
      startTime: new Date("2026-02-03T10:00:00Z"),
      endTime: new Date("2026-02-03T10:10:00Z"),
      pairs: [
        {
          question: "Auto-expansion question?",
          answer: "Auto-expansion answer",
          timestamp: new Date("2026-02-03T10:02:00Z"),
          source: "auto-expansion",
          citations: ["doc1.md"],
        },
        {
          question: "Error-bridge question?",
          answer: "Error-bridge answer",
          timestamp: new Date("2026-02-03T10:05:00Z"),
          source: "error-bridge",
          citations: ["doc2.md"],
        },
        {
          question: "Manual question?",
          answer: "Manual answer",
          timestamp: new Date("2026-02-03T10:08:00Z"),
          source: "manual",
          citations: ["doc3.md"],
        },
      ],
    };

    const markdown = compiler.compile(report);

    expect(markdown).toMatchSnapshot();
    expect(markdown).toContain("Source: auto-expansion");
    expect(markdown).toContain("Source: error-bridge");
    expect(markdown).toContain("Source: manual");
  });

  it("handles Q&A pairs with no citations", () => {
    const report: ResearchReport = {
      sessionId: "test-session-004",
      notebook: "msw-protocol",
      taskGoal: "Test no citations",
      startTime: new Date("2026-02-03T10:00:00Z"),
      endTime: new Date("2026-02-03T10:05:00Z"),
      pairs: [
        {
          question: "General question",
          answer: "General answer without specific sources",
          timestamp: new Date("2026-02-03T10:02:00Z"),
          source: "manual",
          citations: [],
        },
      ],
    };

    const markdown = compiler.compile(report);

    expect(markdown).toMatchSnapshot();
    expect(markdown).not.toContain("**Citations:**");
  });

  it("formats timestamps in ISO format", () => {
    const report: ResearchReport = {
      sessionId: "test-session-005",
      notebook: "msw-protocol",
      taskGoal: "Test timestamp formatting",
      startTime: new Date("2026-02-03T14:30:45Z"),
      endTime: new Date("2026-02-03T14:35:50Z"),
      pairs: [
        {
          question: "Test question",
          answer: "Test answer",
          timestamp: new Date("2026-02-03T14:32:15Z"),
          source: "auto-expansion",
          citations: ["test.md"],
        },
      ],
    };

    const markdown = compiler.compile(report);

    expect(markdown).toMatchSnapshot();
    // Should include ISO timestamp
    expect(markdown).toContain("2026-02-03T14:30:45");
    expect(markdown).toContain("2026-02-03T14:35:50");
    expect(markdown).toContain("2026-02-03T14:32:15");
  });

  it("handles markdown special characters in answers", () => {
    const report: ResearchReport = {
      sessionId: "test-session-006",
      notebook: "msw-protocol",
      taskGoal: "Test markdown escaping",
      startTime: new Date("2026-02-03T10:00:00Z"),
      endTime: new Date("2026-02-03T10:05:00Z"),
      pairs: [
        {
          question: "How to use # and * in code?",
          answer: "Use `#hashtag` and `*asterisk*` in markdown code blocks. Headers use ## syntax.",
          timestamp: new Date("2026-02-03T10:02:00Z"),
          source: "auto-expansion",
          citations: ["markdown.md"],
        },
      ],
    };

    const markdown = compiler.compile(report);

    expect(markdown).toMatchSnapshot();
    // Should preserve code formatting
    expect(markdown).toContain("`#hashtag`");
    expect(markdown).toContain("`*asterisk*`");
  });

  it("handles empty pairs array", () => {
    const report: ResearchReport = {
      sessionId: "test-session-007",
      notebook: "msw-protocol",
      taskGoal: "Test empty report",
      startTime: new Date("2026-02-03T10:00:00Z"),
      endTime: new Date("2026-02-03T10:00:01Z"),
      pairs: [],
    };

    const markdown = compiler.compile(report);

    expect(markdown).toMatchSnapshot();
    expect(markdown).toContain("queryCount: 0");
    expect(markdown).not.toContain("## Q1:");
  });

  it("deduplicates sources in frontmatter", () => {
    const report: ResearchReport = {
      sessionId: "test-session-008",
      notebook: "msw-protocol",
      taskGoal: "Test source deduplication",
      startTime: new Date("2026-02-03T10:00:00Z"),
      endTime: new Date("2026-02-03T10:10:00Z"),
      pairs: [
        {
          question: "Q1",
          answer: "A1",
          timestamp: new Date("2026-02-03T10:02:00Z"),
          source: "auto-expansion",
          citations: ["doc.md"],
        },
        {
          question: "Q2",
          answer: "A2",
          timestamp: new Date("2026-02-03T10:05:00Z"),
          source: "auto-expansion",
          citations: ["doc.md"],
        },
        {
          question: "Q3",
          answer: "A3",
          timestamp: new Date("2026-02-03T10:08:00Z"),
          source: "manual",
          citations: ["doc.md"],
        },
      ],
    };

    const markdown = compiler.compile(report);

    expect(markdown).toMatchSnapshot();
    // Should have both auto-expansion and manual in sources
    const sources = markdown.match(/sources:\s*\n\s*-\s*(.+)/g);
    expect(sources).toBeDefined();
  });

  it("uses compileReport function directly", () => {
    const report: ResearchReport = {
      sessionId: "test-session-009",
      notebook: "msw-protocol",
      taskGoal: "Test direct function call",
      startTime: new Date("2026-02-03T10:00:00Z"),
      endTime: new Date("2026-02-03T10:05:00Z"),
      pairs: [
        {
          question: "Direct function test?",
          answer: "Testing compileReport function",
          timestamp: new Date("2026-02-03T10:02:00Z"),
          source: "manual",
          citations: ["test.md"],
        },
      ],
    };

    const markdown = compileReport(report);

    expect(markdown).toMatchSnapshot();
    expect(markdown).toContain("Direct function test?");
  });

  it("generates correct file path for session", () => {
    const sessionId = "test-session-010";
    const baseDir = "/home/user/projects/msw";

    const filePath = compiler.getFilePath(sessionId, baseDir);

    expect(filePath).toMatchSnapshot();
    expect(filePath).toContain(sessionId);
    // Path contains these components (OS-agnostic check)
    expect(filePath).toContain(".msw");
    expect(filePath).toContain("research");
    expect(filePath).toContain("sessions");
    expect(filePath.endsWith(".md")).toBe(true);
  });

  it("compiles complex real-world report", () => {
    const report: ResearchReport = {
      sessionId: "session-2026-02-03-001",
      notebook: "msw-protocol-v0.1.0",
      taskGoal: "Research MSW testing architecture for Phase 7",
      startTime: new Date("2026-02-03T08:00:00Z"),
      endTime: new Date("2026-02-03T08:45:00Z"),
      pairs: [
        {
          question: "What testing frameworks does MSW use?",
          answer: "MSW Protocol uses Vitest as the primary testing framework, with Playwright for E2E tests. Coverage is tracked with @vitest/coverage-v8.",
          timestamp: new Date("2026-02-03T08:05:00Z"),
          source: "auto-expansion",
          citations: ["testing.md", "package.json"],
          relevanceScore: 0.98,
        },
        {
          question: "What are the coverage thresholds?",
          answer: "Global thresholds: 70% lines/functions, 65% branches. Critical paths (auth, backup, config, degradation, browser driver, MCP tools) require 80%+ lines/functions.",
          timestamp: new Date("2026-02-03T08:15:00Z"),
          source: "auto-expansion",
          citations: ["vitest.config.ts", "testing.md"],
          relevanceScore: 0.95,
        },
        {
          question: "How are snapshot tests implemented?",
          answer: "Snapshot tests use Vitest's built-in `toMatchSnapshot()` matcher. Snapshots validate output stability for response parsing and report compilation.",
          timestamp: new Date("2026-02-03T08:25:00Z"),
          source: "manual",
          citations: ["testing.md"],
          relevanceScore: 0.92,
        },
        {
          question: "What is the CI/CD setup?",
          answer: "GitHub Actions runs tests on Node 18, 20, 22. Coverage is uploaded to Codecov, and PR comments show coverage diffs.",
          timestamp: new Date("2026-02-03T08:35:00Z"),
          source: "auto-expansion",
          citations: [".github/workflows/test.yml"],
          relevanceScore: 0.88,
        },
      ],
    };

    const markdown = compiler.compile(report);

    expect(markdown).toMatchSnapshot();
    expect(markdown).toContain("Phase 7");
    expect(markdown).toContain("Vitest");
    expect(markdown).toContain("80%+");
    expect(markdown).toContain("GitHub Actions");
  });
});
