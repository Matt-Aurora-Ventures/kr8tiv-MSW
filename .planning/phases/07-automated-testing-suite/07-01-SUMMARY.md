---
phase: 07-automated-testing-suite
plan: 01
subsystem: testing-infrastructure
tags: [vitest, coverage, testing, infrastructure, v8]

requires:
  - phase: 06-e2e-integration
    provides: Complete MSW system ready for comprehensive testing

provides:
  - Vitest test infrastructure with V8 coverage
  - Coverage thresholds enforcing 70% global, 80%+ critical paths
  - Test scripts for watch, run, coverage, and UI modes
  - Global test utilities for directory management

affects:
  - phase: 07-automated-testing-suite
    plans: [02, 03, 04, 05, 06]
    why: All subsequent testing plans depend on this infrastructure

tech-stack:
  added:
    - "@vitest/coverage-v8": V8-based coverage reporting (native, fast)
    - "@vitest/ui": Interactive test dashboard for development
  patterns:
    - Per-module coverage thresholds for critical paths
    - Global test setup with automatic cleanup
    - Vitest globals for simplified test syntax

key-files:
  created:
    - tsconfig.test.json: Test-specific TypeScript configuration
  modified:
    - vitest.config.ts: Coverage config with thresholds and reporters
    - package.json: Added test:coverage and test:ui scripts
    - tests/setup.ts: Enhanced with beforeAll/afterAll hooks and cleanup

decisions:
  - id: coverage-provider-v8
    choice: V8 coverage over Istanbul
    rationale: Native V8 coverage is faster and more accurate for Node.js
    date: 2026-02-03

  - id: per-module-thresholds
    choice: Higher thresholds (80%+) for critical paths
    rationale: Auth, backup, config, degradation, browser driver, MCP tools are high-risk
    specifics:
      - global: 70% lines/functions/statements, 65% branches
      - critical: 80% lines/functions, 75% branches
      - browser driver: 85% (highest risk of bot detection)
    date: 2026-02-03

  - id: global-cleanup-hooks
    choice: beforeAll/afterAll cleanup of stale test directories
    rationale: Prevent tmp pollution from test runs, cleanup dirs >1 hour old
    date: 2026-02-03

metrics:
  duration: 17 minutes
  tasks: 3
  commits: 3
  completed: 2026-02-03
---

# Phase 7 Plan 1: Vitest Infrastructure Setup Summary

**One-liner:** Vitest test infrastructure with V8 coverage, per-module thresholds (80%+ critical paths), and global cleanup utilities.

## What Was Built

### Coverage Configuration
- **Provider:** V8 (native, fast)
- **Reporters:** text, json, html, lcov
- **Global thresholds:** 70% lines/functions/statements, 65% branches
- **Critical path thresholds (80%+):**
  - `src/auth/**/*.ts`: 80%/75%
  - `src/backup/**/*.ts`: 80%/75%
  - `src/config/**/*.ts`: 80%/75%
  - `src/common/degradation.ts`: 80%/75%
  - `src/browser/driver.ts`: 85% (highest risk)
  - `src/mcp/tools/**/*.ts`: 80%

### Test Scripts
Added to `package.json`:
- `test`: Run tests once
- `test:watch`: Watch mode
- `test:coverage`: Run with coverage reporting
- `test:ui`: Interactive Vitest dashboard

### Global Test Utilities
Enhanced `tests/setup.ts`:
- **beforeAll:** Automatic cleanup of stale test directories (>1 hour old)
- **createTestDir(prefix):** Create unique tmp directory for tests
- **cleanupTestDir(dir):** Clean up test directory after use

## Verification Results

✅ **Infrastructure checks:**
1. `npm run test:coverage` executes successfully
2. Coverage enabled with v8 provider
3. Thresholds configured for critical paths
4. Global utilities available (createTestDir, cleanupTestDir)

**Coverage output:** Coverage directory creation works (tested with passing tests)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | df6d921 | Install @vitest/coverage-v8 and @vitest/ui |
| 2 | c5cfe97 | Configure coverage with per-module thresholds |
| 3 | 85a5d38 | Add test scripts and global setup utilities |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 07-02 (Unit Tests - Critical Modules):**
- ✅ Test infrastructure configured
- ✅ Coverage thresholds defined for critical modules
- ✅ Global utilities available for test isolation
- ✅ Test scripts ready for development workflow

**Blockers:** None

**Next steps:**
1. Write unit tests for auth modules (07-02)
2. Write unit tests for backup modules (07-02)
3. Write unit tests for config modules (07-02)
4. Achieve 80%+ coverage on critical paths

## Notes

- V8 coverage provider chosen for speed and accuracy over Istanbul
- Critical paths identified based on risk: auth, backup, config, degradation, browser driver, MCP tools
- Browser driver gets highest threshold (85%) due to bot detection risk
- Global cleanup prevents tmp directory pollution from test runs
