# Implementation Report: Wire MCP Tools to Real Engine Implementations (06-01)
Generated: 2026-02-02

## Task
Replaced stub implementations in all 4 MCP tool handlers with real engine wiring, connecting browser orchestration, auto-conversation, planning, execution, and verification pipelines.

## Changes Made

### src/mcp/tools/msw-research.ts
- Replaced stub `runResearchJob` with full pipeline: BrowserDriver -> NotebookNavigator -> TopicExpansionEngine -> ReportCompiler
- Dynamic imports of BrowserDriver, NotebookNavigator, TopicExpansionEngine, ReportCompiler
- Launches browser, navigates to NotebookLM notebook URL from config, runs BFS topic expansion
- Persists results as markdown reports via ReportCompiler to `.msw/research/sessions/`
- Graceful fallback if engine modules not available at runtime

### src/mcp/tools/msw-plan.ts
- Replaced string-template PRD with real `generatePrd()` from `planning/prd-generator.js`
- Added new tool parameters: projectName, description, constraints, requirements
- Falls back to template-based PRD if PrdGenerator import fails

### src/mcp/tools/msw-execute.ts
- Replaced stub delay loop with real IterationTracker + CompletionDetector from `execution/`
- Initializes Ralph state with proper TaskContext, tracks iterations via file-based state
- Uses CompletionDetector to check transcript + run verification commands for early completion
- Added new tool parameters: completionPromise, verifyCommands
- Falls back to stub iteration if execution engines unavailable

### src/mcp/tools/msw-verify.ts
- Wired BehavioralVerifier from `execution/behavioral-verifier.js`
- Added new tool parameters: commands, expectedOutputPatterns, timeoutMs
- Runs real test commands via BehavioralVerifier.verify() with structured pass/fail results
- Falls back to file-based summary if no commands provided or verifier unavailable

## Test Results
- `npx tsc --noEmit`: 0 errors

## Key Integration Points
| MCP Tool | Engine(s) Wired |
|----------|----------------|
| msw_research | BrowserDriver, NotebookNavigator, TopicExpansionEngine, ReportCompiler |
| msw_plan | generatePrd (PrdGenerator) |
| msw_execute | IterationTracker, CompletionDetector |
| msw_verify | BehavioralVerifier |

## Notes
- All integrations use dynamic `await import()` for graceful degradation when engines are not built
- No stub messages about "pipeline required" remain in the wired code paths
- The research tool uses the first notebook URL from `.msw/config.json` notebookUrls array
