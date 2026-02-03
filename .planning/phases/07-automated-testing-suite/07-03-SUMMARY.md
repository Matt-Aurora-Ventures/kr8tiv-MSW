---
phase: 07
plan: 03
subsystem: testing
tags: [mock-ui, test-fixtures, playwright, express, selectors]
dependency_graph:
  requires: ["07-01", "07-02"]
  provides: ["mock-notebooklm-server", "selector-validation-tests"]
  affects: ["07-04", "07-05"]
tech_stack:
  added: ["express", "@types/express"]
  patterns: ["express-mock-server", "playwright-browser-testing"]
key_files:
  created:
    - tests/mocks/notebooklm-ui.html
    - tests/helpers/mock-notebooklm.ts
    - tests/unit/browser/selectors.test.ts
  modified:
    - package.json
decisions:
  - decision: "Express server for mock UI instead of static file serving"
    rationale: "Allows programmatic control, network delay simulation, and API endpoint testing"
    alternatives: ["Static file server", "Playwright mock routes"]
  - decision: "Random port allocation for mock server"
    rationale: "Prevents port conflicts when running tests in parallel or with other services"
    alternatives: ["Fixed port 3000", "Port range selection"]
  - decision: "Real browser (Chromium) for selector tests instead of mocking Playwright"
    rationale: "Tests actual selector behavior against real DOM, catches selector issues early"
    alternatives: ["Mock Playwright locators", "JSDOM"]
metrics:
  duration: 12
  completed: 2026-02-03
---

# Phase 07 Plan 03: Mock NotebookLM UI and Selector Tests Summary

Mock NotebookLM UI infrastructure built with Express server and Playwright-based selector validation tests.

## Objective

Build mock NotebookLM UI and selector test fixtures to enable deterministic testing of browser selectors without live NotebookLM dependency.

## What Was Built

### 1. Mock NotebookLM UI HTML (`tests/mocks/notebooklm-ui.html`)

Static HTML page mimicking real NotebookLM structure:

**Semantic Elements:**
- Chat input: `role="textbox"`, `aria-label="Ask about your notes"`
- Send button: `role="button"`, `aria-label="Send message"`
- Topic pills: `role="button"` with `data-topic` attributes
- Response container: `data-message-author="assistant"`
- Streaming state: `data-streaming="true/false"`

**Interactive Features:**
- 3 topic pills (authentication, testing, browser)
- Click handlers that generate mock responses
- Streaming simulation (200ms delay before setting `data-streaming="false"`)
- Citations in mock responses

**Lines:** 161

### 2. Mock Server Helper (`tests/helpers/mock-notebooklm.ts`)

Express server for serving mock UI:

**Features:**
- Random port allocation (port 0 = OS-assigned random port)
- Network latency simulation (optional `delayMs` parameter)
- Clean shutdown via `close()` promise
- Notebook route: `/notebook/:id`
- Optional API endpoint: `/api/query` for programmatic testing

**Interface:**
```typescript
interface MockNotebookLMServer {
  url: string;        // Full URL to mock notebook
  port: number;       // Assigned port
  close: () => Promise<void>;
}
```

**Lines:** 66

### 3. Selector Validation Tests (`tests/unit/browser/selectors.test.ts`)

Playwright-based tests validating all selectors:

**Test Coverage:**
- Selectors export structure validation (factory functions exist)
- Chat input: visibility, aria-label, editability
- Send button: visibility, aria-label, clickability
- Topic pills: count, data-topic attributes, click generates response
- Response container: visibility after topic click, text content extraction
- Streaming detection: `data-streaming="false"` after completion

**Test Infrastructure:**
- Real Chromium browser launched headless
- Mock server started before tests
- Clean teardown in `afterAll`

**Results:** 11 tests, all passing, deterministic across multiple runs

**Lines:** 147

### Dependencies Added

```json
{
  "devDependencies": {
    "express": "^4.x.x",
    "@types/express": "^4.x.x"
  }
}
```

## Implementation Details

### Mock Server Architecture

```
startMockNotebookLM()
  ↓
Express app created
  ↓
Middleware: Network delay (optional)
  ↓
Route: /notebook/:id → serve HTML
  ↓
Route: /api/query → JSON response (for future API tests)
  ↓
Listen on random port
  ↓
Return { url, port, close }
```

### Selector Test Flow

```
beforeAll: Start mock server + launch browser
  ↓
Navigate to mock URL
  ↓
Test each selector:
  - chatInput: Selectors.chatInput(page)
  - sendButton: Selectors.sendButton(page)
  - topicPills: Selectors.topicPills(page)
  - responseContainer: Selectors.responseContainer(page)
  ↓
Validate visibility, attributes, interactions
  ↓
afterAll: Close browser + shut down server
```

### Playwright Assertions Fix

Initial implementation used Jest-style `expect(locator).toBeVisible()` which failed because Vitest doesn't have Playwright matchers built-in.

**Fixed by using Playwright's native methods:**
```typescript
// Before (failed)
await expect(input).toBeVisible();

// After (works)
const isVisible = await input.isVisible();
expect(isVisible).toBe(true);
```

## Test Results

**All tests pass deterministically:**

```
Test Files  1 passed (1)
Tests       11 passed (11)
Duration    ~1-2s per run
```

**Three consecutive runs:**
- Run 1: 11 passed (977ms)
- Run 2: 11 passed (1055ms)
- Run 3: 11 passed (962ms)

**No flakiness detected** - same results every run.

## Decisions Made

### 1. Express Server vs Static File Serving

**Chosen:** Express server with programmatic control

**Rationale:**
- Allows network delay simulation for timing tests
- Provides API endpoints for future programmatic testing
- Easy to extend with custom routes/responses
- Still simple (66 lines total)

**Alternatives:**
- Static file server: Less flexible, no delay simulation
- Playwright mock routes: More complex, ties mocks to test code

### 2. Random Port Allocation

**Chosen:** Port 0 (OS-assigned random port)

**Rationale:**
- No port conflicts when running tests in parallel
- No conflicts with other local services
- Works across different dev machines without config

**Alternatives:**
- Fixed port 3000: Conflicts with typical dev servers
- Port range selection: Complex, still risk of conflicts

### 3. Real Browser vs Mocking

**Chosen:** Real Chromium browser via Playwright

**Rationale:**
- Tests actual selector behavior against real DOM
- Catches selector issues that mocks would hide
- Same environment as production browser automation
- Playwright launch overhead (~1s) acceptable for these tests

**Alternatives:**
- Mock Playwright locators: Doesn't test actual selector logic
- JSDOM: Doesn't support full browser APIs

## Files Created/Modified

### Created (3 files)

| File | Lines | Purpose |
|------|-------|---------|
| tests/mocks/notebooklm-ui.html | 161 | Mock NotebookLM HTML with semantic structure |
| tests/helpers/mock-notebooklm.ts | 66 | Express server for serving mock UI |
| tests/unit/browser/selectors.test.ts | 147 | Selector validation tests |

### Modified (2 files)

| File | Change |
|------|--------|
| package.json | Added express, @types/express dev dependencies |
| package-lock.json | Dependency lock updates |

## Verification Completed

1. Mock UI structure inspection: 6 role attributes found
2. Mock server imports verified: express and Server type imported
3. Selector tests executed: All 11 tests pass
4. Determinism validated: 3 consecutive runs, same results each time
5. No external dependencies: Mock server runs locally, no NotebookLM calls

## Commits

| Hash | Message | Files |
|------|---------|-------|
| b719b53 | test(07-03): add mock NotebookLM UI HTML | notebooklm-ui.html |
| df854fa | test(07-03): add mock NotebookLM server helper | mock-notebooklm.ts, package.json |
| 73fb7fa | test(07-03): add selector validation tests | selectors.test.ts |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

### Ready for 07-04: Integration Tests

The mock NotebookLM infrastructure is ready to support:
- Auth flow integration tests (validate selectors + authenticator together)
- Navigator integration tests (selectors + navigator + extractor)
- Full browser automation flow tests

**Provided capabilities:**
- `startMockNotebookLM()` helper can be reused across test suites
- Mock UI can be extended with additional scenarios (error states, loading, etc.)
- Selector tests establish baseline for expected selector behavior

**Blockers:** None

**Concerns:** None - all tests deterministic and isolated

### Integration Points for 07-04

Mock server can be extended with:
- `/auth/check` endpoint to simulate auth state
- Dynamic topic pills based on query parameters
- Error state simulations (500 errors, timeouts)
- Multiple notebook scenarios (empty, populated, error state)

Current mock is minimal but extensible for future needs.

## Summary

Mock NotebookLM UI infrastructure successfully built and validated. All 11 selector tests pass deterministically using real Chromium browser against Express-served mock HTML. Zero external dependencies - tests run entirely locally without NotebookLM access.

**Key Achievement:** Deterministic selector testing without live NotebookLM dependency unlocks fast, reliable selector validation in CI/CD pipeline.

**Duration:** 12 minutes
**Status:** Complete, all success criteria met
