# Phase 7: Automated Testing Suite - Research

**Researched:** 2026-02-03
**Domain:** Test infrastructure, unit/integration/E2E testing, coverage analysis, mock NotebookLM UI
**Confidence:** HIGH

## Summary

Phase 7 establishes comprehensive automated testing across unit, integration, and E2E levels to achieve 80%+ coverage on critical paths. The codebase already has Vitest 4.x configured with a basic E2E test harness (`tests/e2e/mcp-client.test.ts`) and two manual test scripts (`tests/test-gsd-adapter.ts`, `tests/test-pipeline-orchestrator.ts`).

The primary work is: (1) converting manual tests to Vitest, (2) building unit tests for auth, backup, config, and degradation modules with mocked dependencies, (3) creating integration tests for multi-component flows (auth flow, backup-restore), (4) implementing E2E tests for complete workflows (NotebookLM upload, error-to-resolution), (5) adding coverage reporting and enforcement, and (6) building a mock NotebookLM UI for deterministic selector testing without live NotebookLM dependency.

**Primary recommendation:** Use Vitest for all test types (unit, integration, E2E), leverage in-memory MCP testing patterns for fast unit tests, use stdio-based E2E tests that spawn the actual server, and implement a Playwright-served mock NotebookLM page for selector testing.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| [vitest](https://vitest.dev/) | ^4.0.18 (already installed) | Test framework | Fast, ESM-native, TypeScript support, browser mode available |
| [@vitest/coverage-v8](https://vitest.dev/guide/coverage) | ^4.x | Coverage reporting | Built-in V8 coverage, integrates with Vitest |
| [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) | ^1.25.3 (already installed) | MCP client for E2E testing | Test server via stdio using official client |
| [playwright](https://playwright.dev/) | ^1.58.1 (already installed) | Browser automation for E2E | Already the browser engine, mock UI server |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| [@vitest/ui](https://vitest.dev/guide/ui.html) | ^4.x | Test UI dashboard | Optional: Visual test monitoring during development |
| [c8](https://github.com/bcoe/c8) | latest | Alternative coverage tool | If V8 coverage has issues; Vitest's built-in is preferred |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vitest | Jest | Jest has worse ESM support, slower, heavier config |
| V8 coverage | Istanbul/nyc | V8 is faster, native, matches Node runtime |
| In-memory MCP testing | Subprocess spawning | Subprocess adds latency, race conditions; in-memory is faster |

**Installation:**
```bash
npm install -D @vitest/coverage-v8 @vitest/ui
```

## Architecture Patterns

### Recommended Test Structure
```
tests/
├── unit/                          # Pure unit tests (mocked dependencies)
│   ├── auth/
│   │   └── authenticator.test.ts  # Token validation, session persistence, logout detection
│   ├── backup/
│   │   └── manager.test.ts        # State serialization, restoration, corruption recovery
│   ├── config/
│   │   └── manager.test.ts        # Validation, schema enforcement, defaults
│   ├── degradation/
│   │   └── handler.test.ts        # Offline mode, cache behavior, recovery
│   ├── browser/
│   │   ├── driver.test.ts         # Launch, close, profile management
│   │   └── selectors.test.ts      # Selector resolution against mock UI
│   └── mcp/
│       └── tools.test.ts          # Tool validation, parameter parsing
├── integration/                   # Multi-component tests (real deps, mock browser)
│   ├── auth-flow.test.ts          # Login → persist → restore flow
│   ├── backup-restore.test.ts     # Save → corrupt → recover flow
│   └── research-pipeline.test.ts  # Topic detection → click → extract (mocked browser)
├── e2e/                           # Full pipeline (spawned MCP server)
│   ├── mcp-client.test.ts         # (existing) MCP tool smoke tests
│   ├── notebooklm-upload.test.ts  # Init → query → extract → commit
│   ├── error-resolution.test.ts   # Error detection → NotebookLM query → fix injection
│   └── helpers/
│       ├── spawn-server.ts        # (existing) MCP server spawning
│       ├── mock-notebooklm.ts     # Mock NotebookLM UI server
│       └── test-fixtures.ts       # Common test data
├── mocks/                         # Shared mocks and fixtures
│   ├── notebooklm-ui.html         # Mock NotebookLM page structure
│   ├── browser-mocks.ts           # Mocked Playwright Page/Context
│   └── mcp-responses.ts           # Sample MCP tool responses
└── vitest.config.ts               # Vitest configuration with coverage
```

### Pattern 1: Unit Testing with Mocked Dependencies
**What:** Test individual modules in isolation with all external dependencies mocked.
**When to use:** Testing auth, backup, config, degradation modules.
**Example:**
```typescript
// tests/unit/auth/authenticator.test.ts
import { describe, it, expect, vi } from "vitest";
import { Authenticator } from "../../../src/auth/authenticator.js";
import type { Page } from "playwright";

describe("Authenticator", () => {
  it("validates session token from cookies", async () => {
    const mockPage = {
      cookies: vi.fn().mockResolvedValue([
        { name: "SID", value: "valid-token", domain: ".google.com" },
      ]),
    } as unknown as Page;

    const auth = new Authenticator(mockPage);
    const result = await auth.validateSession();

    expect(result.authenticated).toBe(true);
    expect(result.sessionId).toBe("valid-token");
  });

  it("detects logout from missing session cookie", async () => {
    const mockPage = {
      cookies: vi.fn().mockResolvedValue([]),
    } as unknown as Page;

    const auth = new Authenticator(mockPage);
    const result = await auth.validateSession();

    expect(result.authenticated).toBe(false);
    expect(result.reason).toContain("logout");
  });
});
```

### Pattern 2: Integration Testing Multi-Component Flows
**What:** Test workflows that span multiple components with real implementations but mocked browser.
**When to use:** Auth flow (login → persist → restore), backup-restore flow.
**Example:**
```typescript
// tests/integration/auth-flow.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Authenticator } from "../../src/auth/authenticator.js";
import { BackupManager } from "../../src/backup/manager.js";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("Auth flow integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "msw-auth-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("persists auth state and restores after crash", async () => {
    // Simulate login
    const mockPage = createMockPageWithCookies([
      { name: "SID", value: "session-123" },
    ]);

    const auth1 = new Authenticator(mockPage);
    const loginResult = await auth1.validateSession();
    expect(loginResult.authenticated).toBe(true);

    // Backup auth state
    const backup = new BackupManager(tmpDir);
    await backup.saveState({ sessionId: "session-123", cookies: [...] });

    // Simulate crash + restore
    const restoreResult = await backup.restoreState();
    expect(restoreResult.success).toBe(true);
    expect(restoreResult.state.sessionId).toBe("session-123");

    // Validate restored session
    const auth2 = new Authenticator(mockPageFromCookies(restoreResult.state.cookies));
    const validateResult = await auth2.validateSession();
    expect(validateResult.authenticated).toBe(true);
  });
});
```

### Pattern 3: E2E Testing with Spawned MCP Server
**What:** Spawn the actual MCP server as a child process, connect via stdio using MCP SDK Client, call tools, assert results.
**When to use:** Testing complete MCP tool flows that integrate all components.
**Example:**
```typescript
// tests/e2e/notebooklm-upload.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestClient, type TestClient } from "./helpers/spawn-server.js";
import { startMockNotebookLM } from "./helpers/mock-notebooklm.js";
import fs from "node:fs";
import path from "node:path";

describe("NotebookLM upload E2E", () => {
  let tc: TestClient;
  let mockServer: { url: string; close: () => Promise<void> };
  let projectDir: string;

  beforeAll(async () => {
    tc = await createTestClient();
    mockServer = await startMockNotebookLM();
    projectDir = path.join(os.tmpdir(), `msw-e2e-${Date.now()}`);
    fs.mkdirSync(projectDir, { recursive: true });

    // Initialize project with mock notebook URL
    await tc.client.callTool({
      name: "msw_init",
      arguments: {
        projectDir,
        notebookUrl: mockServer.url,
      },
    });
  });

  afterAll(async () => {
    await tc?.cleanup();
    await mockServer?.close();
    fs.rmSync(projectDir, { recursive: true, force: true });
  });

  it("uploads sources and triggers research", async () => {
    // Upload a test file
    const testFile = path.join(projectDir, "test.md");
    fs.writeFileSync(testFile, "# Test Content\nSample data");

    const uploadResult = await tc.client.callTool({
      name: "msw_upload_sources",
      arguments: {
        projectDir,
        sources: [testFile],
      },
    });

    const data = JSON.parse(uploadResult.content[0].text);
    expect(data.success).toBe(true);
    expect(data.uploaded).toContain("test.md");

    // Trigger research (should detect topics in mock UI)
    const researchResult = await tc.client.callTool({
      name: "msw_research",
      arguments: { projectDir },
    });

    const researchData = JSON.parse(researchResult.content[0].text);
    expect(researchData.jobId).toBeDefined();
    expect(researchData.status).toBe("running");
  });
});
```

### Pattern 4: Mock NotebookLM UI for Selector Testing
**What:** Serve a static HTML page that mimics NotebookLM's structure for deterministic selector testing.
**When to use:** Testing browser selectors without live NotebookLM dependency.
**Example:**
```typescript
// tests/helpers/mock-notebooklm.ts
import { chromium, type Page } from "playwright";
import express from "express";
import path from "node:path";

export async function startMockNotebookLM(): Promise<{
  url: string;
  close: () => Promise<void>;
}> {
  const app = express();

  // Serve mock UI HTML
  app.get("/notebook/:id", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Mock NotebookLM</title></head>
        <body>
          <textarea role="textbox" aria-label="Ask about your notes"></textarea>
          <button role="button" aria-label="Send message">Send</button>
          <div role="list" aria-label="Suggested topics">
            <button role="button" data-topic="authentication">Learn about authentication</button>
            <button role="button" data-topic="testing">Learn about testing patterns</button>
          </div>
          <div data-message-author="assistant">
            <p>This is a mock response from NotebookLM.</p>
          </div>
        </body>
      </html>
    `);
  });

  const server = app.listen(0); // Random port
  const port = (server.address() as any).port;
  const url = `http://localhost:${port}/notebook/mock-123`;

  return {
    url,
    close: async () => {
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

// tests/unit/browser/selectors.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "playwright";
import { startMockNotebookLM } from "../../helpers/mock-notebooklm.js";
import { SELECTORS } from "../../../src/browser/selectors.js";

describe("NotebookLM selectors", () => {
  let browser: Browser;
  let page: Page;
  let mockServer: { url: string; close: () => Promise<void> };

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
    mockServer = await startMockNotebookLM();
  });

  afterAll(async () => {
    await page?.close();
    await browser?.close();
    await mockServer?.close();
  });

  it("finds chat input using semantic selector", async () => {
    await page.goto(mockServer.url);
    const input = await SELECTORS.chatInput(page);
    expect(await input.isVisible()).toBe(true);
    expect(await input.getAttribute("aria-label")).toContain("Ask");
  });

  it("finds topic pills using role and data attributes", async () => {
    await page.goto(mockServer.url);
    const pills = await SELECTORS.topicPills(page).all();
    expect(pills.length).toBe(2);
    expect(await pills[0].getAttribute("data-topic")).toBe("authentication");
  });
});
```

### Pattern 5: Coverage Configuration and Enforcement
**What:** Configure Vitest to generate coverage reports and enforce minimum thresholds on critical paths.
**When to use:** Always, to ensure 80%+ coverage on critical modules.
**Example:**
```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/index.ts", // Barrel exports
        "src/types/**", // Type definitions
      ],
      thresholds: {
        // Global thresholds
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
        // Per-file thresholds for critical paths
        "src/auth/**/*.ts": {
          lines: 80,
          functions: 80,
          branches: 75,
        },
        "src/backup/**/*.ts": {
          lines: 80,
          functions: 80,
          branches: 75,
        },
        "src/browser/driver.ts": {
          lines: 85,
          functions: 85,
        },
        "src/mcp/tools/**/*.ts": {
          lines: 80,
          functions: 80,
        },
      },
    },
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
  },
});
```

### Pattern 6: Snapshot Testing for Response Parsing
**What:** Use Vitest snapshots to validate response parsing and markdown compilation outputs.
**When to use:** Testing response parser, markdown compiler, report generator.
**Example:**
```typescript
// tests/unit/bidirectional/response-parser.test.ts
import { describe, it, expect } from "vitest";
import { ResponseParser } from "../../../src/bidirectional/response-parser.js";

describe("ResponseParser", () => {
  it("parses NotebookLM response with citations", () => {
    const html = `
      <div data-message-author="assistant">
        <p>Authentication uses OAuth 2.0 tokens.</p>
        <cite>[Source: auth.md]</cite>
      </div>
    `;

    const parser = new ResponseParser();
    const result = parser.parse(html);

    expect(result).toMatchSnapshot(); // Validates entire structure
    expect(result.answer).toBe("Authentication uses OAuth 2.0 tokens.");
    expect(result.citations).toEqual(["Source: auth.md"]);
  });

  it("compiles Q&A pairs to markdown report", () => {
    const qaPairs = [
      {
        question: "How does auth work?",
        answer: "Uses OAuth 2.0",
        citations: ["auth.md"],
      },
      {
        question: "How to test?",
        answer: "Use Vitest",
        citations: ["testing.md"],
      },
    ];

    const compiler = new ReportCompiler();
    const markdown = compiler.compile(qaPairs);

    expect(markdown).toMatchSnapshot();
  });
});
```

## Testing Strategy by Requirement

| Requirement | Test Type | Key Test Cases | Coverage Target |
|-------------|-----------|----------------|-----------------|
| **TEST-01**: Unit test infrastructure | Setup | Vitest config, coverage reporting, CI integration | N/A (infrastructure) |
| **TEST-02**: Auth module tests | Unit | Token validation, session persistence, logout detection, token expiry | 80%+ |
| **TEST-03**: Backup module tests | Unit | State serialization, restoration, corruption detection, backup integrity | 80%+ |
| **TEST-04**: Config module tests | Unit | Schema validation, defaults, invalid config rejection, type safety | 80%+ |
| **TEST-05**: Degradation module tests | Unit | Offline mode, cache behavior, fallback chains, recovery triggers | 80%+ |
| **TEST-06**: Auth flow integration | Integration | Login → persist → restore, crash recovery, cookie sync | 75%+ |
| **TEST-07**: Backup-restore integration | Integration | Save → corrupt → recover, multiple backups, rollback | 75%+ |
| **TEST-08**: NotebookLM upload E2E | E2E | Init → upload → trigger research → commit, source validation | 70%+ |
| **TEST-09**: Error-to-resolution E2E | E2E | Error detection → NotebookLM query → guidance extraction → fix injection | 70%+ |
| **TEST-10**: Coverage reporting | All | Coverage thresholds enforced, critical paths 80%+, reports generated | 80%+ |
| **TEST-11**: Snapshot testing | Unit | Response parsing, markdown compilation, report format stability | 75%+ |
| **TEST-12**: Mock NotebookLM UI | Integration | Selector validation, topic detection, response extraction determinism | N/A (mock) |

## Critical Testing Scenarios

### 1. Auth Module (TEST-02)
**Test cases:**
- Valid session token → authenticated
- Missing session cookie → not authenticated
- Expired token → re-authentication required
- Session persist → cookies saved to backup
- Session restore → cookies loaded from backup
- Logout detection → session invalidation

**Mocking strategy:**
- Mock Playwright `Page.cookies()` and `Page.context().cookies()`
- Mock cookie storage backend (fs or in-memory)

### 2. Backup Module (TEST-03)
**Test cases:**
- State serialization → JSON file created
- State restoration → valid state object returned
- Corrupted backup → detection and fallback
- Multiple backups → rollback to N-1
- Backup integrity → checksum validation

**Mocking strategy:**
- Use `memfs` for in-memory filesystem testing
- Mock file corruption scenarios

### 3. Config Module (TEST-04)
**Test cases:**
- Valid config → loads successfully
- Invalid URL → validation error
- Missing required fields → defaults applied
- Schema mismatch → clear error message
- Config update → persists to disk

**Mocking strategy:**
- Mock `fs.readFileSync` and `fs.writeFileSync`
- Use Zod schema validation directly

### 4. Degradation Module (TEST-05)
**Test cases:**
- Offline mode → cached responses used
- Fallback chain → tries primary, then fallback
- Recovery trigger → degradation level changes
- Capability detection → reports degraded services
- User messaging → clear status messages

**Mocking strategy:**
- Mock network requests to fail
- Mock browser launch to fail (fallback to visible mode)

### 5. Integration Tests (TEST-06, TEST-07)
**Auth flow:**
- Login → persist cookies → crash → restore cookies → validate session

**Backup-restore flow:**
- Save state → corrupt backup file → detect corruption → recover from previous backup

**Mocking strategy:**
- Real implementations (Authenticator, BackupManager, ConfigManager)
- Mocked Playwright Page/Context
- Temporary directories for file operations

### 6. E2E Tests (TEST-08, TEST-09)
**NotebookLM upload:**
- Initialize project → upload sources → trigger research → extract Q&A → commit to git

**Error-to-resolution:**
- Simulate coding error → detect error → query NotebookLM → extract guidance → inject into next iteration

**Mocking strategy:**
- Spawn real MCP server via stdio
- Mock NotebookLM UI served via Playwright
- Real git operations in temp directory

## Test Data Fixtures

### Sample Configs
```typescript
// tests/mocks/test-fixtures.ts
export const VALID_CONFIG = {
  version: "0.1.0",
  notebookUrl: "https://notebooklm.google.com/notebook/abc123",
  relevanceThreshold: 30,
  maxIterations: 10,
};

export const INVALID_CONFIGS = {
  missingUrl: { version: "0.1.0" },
  invalidUrl: { version: "0.1.0", notebookUrl: "not-a-url" },
  invalidVersion: { notebookUrl: "https://...", version: 999 },
};
```

### Sample Auth Cookies
```typescript
export const VALID_SESSION_COOKIES = [
  { name: "SID", value: "session-token-123", domain: ".google.com" },
  { name: "HSID", value: "host-token-456", domain: ".google.com" },
];

export const EXPIRED_SESSION_COOKIES = [
  { name: "SID", value: "expired-token", domain: ".google.com", expires: Date.now() - 86400 },
];
```

### Sample NotebookLM Responses
```typescript
export const MOCK_NOTEBOOKLM_RESPONSE = {
  answer: "Authentication in MSW uses persistent Chrome profiles to maintain Google session cookies.",
  citations: ["auth.md", "browser.md"],
  suggestedTopics: [
    "Learn about profile management",
    "Learn about cookie persistence",
  ],
};
```

## Coverage Analysis Approach

### Critical Paths (80%+ coverage required)
1. **Browser automation** (`src/browser/driver.ts`, `src/browser/stealth.ts`)
   - Launch, close, profile management
   - Stealth configuration

2. **MCP tools** (`src/mcp/tools/*.ts`)
   - Tool validation, parameter parsing
   - Response formatting

3. **Execution engines** (`src/execution/ralph-runner.ts`, `src/pipeline/orchestrator.ts`)
   - Iteration management
   - State persistence

4. **Auth, backup, config, degradation** (`src/auth`, `src/backup`, `src/config`, `src/common/degradation.ts`)
   - Core reliability features

### Medium Priority (70-75% coverage)
1. **Auto-conversation** (`src/auto-conversation`)
2. **Bidirectional** (`src/bidirectional`)
3. **Knowledge persistence** (`src/knowledge`)

### Lower Priority (60-65% coverage)
1. **Type definitions** (`src/types`)
2. **Barrel exports** (`src/*/index.ts`)
3. **Utilities** (low complexity helpers)

## Testing Workflow

### Development Workflow
```bash
# Watch mode during development
npm run test:watch

# Run all tests before commit
npm test

# Generate coverage report
npm run test:coverage

# Open HTML coverage report
open coverage/index.html
```

### CI/CD Workflow (Phase 8)
```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## Mock NotebookLM UI Implementation

### HTML Structure
```html
<!-- tests/mocks/notebooklm-ui.html -->
<!DOCTYPE html>
<html>
  <head>
    <title>Mock NotebookLM</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      .chat-input { width: 100%; padding: 10px; }
      .suggested-topics { margin: 20px 0; }
      .topic-pill { margin: 5px; padding: 10px; border: 1px solid #ccc; }
      .response { padding: 15px; background: #f5f5f5; margin: 10px 0; }
    </style>
  </head>
  <body>
    <h1>Mock NotebookLM</h1>

    <!-- Chat input -->
    <textarea
      role="textbox"
      aria-label="Ask about your notes"
      class="chat-input"
      id="chat-input"></textarea>
    <button
      role="button"
      aria-label="Send message"
      onclick="handleSend()">Send</button>

    <!-- Suggested topics -->
    <div role="list" aria-label="Suggested topics" class="suggested-topics">
      <button role="button" data-topic="auth" class="topic-pill" onclick="handleTopicClick('auth')">
        Learn about authentication
      </button>
      <button role="button" data-topic="testing" class="topic-pill" onclick="handleTopicClick('testing')">
        Learn about testing patterns
      </button>
      <button role="button" data-topic="browser" class="topic-pill" onclick="handleTopicClick('browser')">
        Learn about browser automation
      </button>
    </div>

    <!-- Response container -->
    <div id="responses"></div>

    <script>
      const responses = {
        auth: "Authentication in MSW uses persistent Chrome profiles to maintain Google session cookies. [Source: auth.md]",
        testing: "Testing follows a three-tier approach: unit tests with mocked dependencies, integration tests with real components, and E2E tests with the full system. [Source: testing.md]",
        browser: "Browser automation uses Playwright with stealth plugins to avoid bot detection. [Source: browser.md]",
      };

      function handleTopicClick(topic) {
        const responseDiv = document.createElement('div');
        responseDiv.className = 'response';
        responseDiv.setAttribute('data-message-author', 'assistant');
        responseDiv.innerHTML = `<p>${responses[topic] || 'No response available.'}</p>`;
        document.getElementById('responses').appendChild(responseDiv);

        // Simulate streaming completion (for wait detection tests)
        setTimeout(() => {
          responseDiv.setAttribute('data-streaming', 'false');
        }, 100);
      }

      function handleSend() {
        const input = document.getElementById('chat-input');
        const query = input.value.toLowerCase();

        // Match query to topic
        if (query.includes('auth')) handleTopicClick('auth');
        else if (query.includes('test')) handleTopicClick('testing');
        else if (query.includes('browser')) handleTopicClick('browser');
        else {
          const responseDiv = document.createElement('div');
          responseDiv.className = 'response';
          responseDiv.setAttribute('data-message-author', 'assistant');
          responseDiv.innerHTML = '<p>I can help with authentication, testing, and browser automation topics.</p>';
          document.getElementById('responses').appendChild(responseDiv);
        }

        input.value = '';
      }
    </script>
  </body>
</html>
```

### Mock Server Implementation
```typescript
// tests/helpers/mock-notebooklm.ts
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function startMockNotebookLM(options?: {
  port?: number;
  delayMs?: number; // Simulate network latency
}): Promise<{
  url: string;
  port: number;
  close: () => Promise<void>;
}> {
  const app = express();
  const delay = options?.delayMs ?? 0;

  // Middleware to simulate network latency
  if (delay > 0) {
    app.use((req, res, next) => {
      setTimeout(next, delay);
    });
  }

  // Serve mock UI
  app.get("/notebook/:id", (req, res) => {
    const htmlPath = path.join(__dirname, "../mocks/notebooklm-ui.html");
    res.sendFile(htmlPath);
  });

  // API endpoint for programmatic responses (for advanced testing)
  app.post("/api/query", express.json(), (req, res) => {
    const { query } = req.body;
    const mockResponse = {
      answer: `Mock response to: ${query}`,
      citations: ["test.md"],
      suggestedTopics: ["Related topic 1", "Related topic 2"],
    };
    res.json(mockResponse);
  });

  const port = options?.port ?? 0; // Random port if not specified
  const server = app.listen(port);
  const actualPort = (server.address() as any).port;
  const url = `http://localhost:${actualPort}/notebook/mock-123`;

  return {
    url,
    port: actualPort,
    close: async () => {
      return new Promise((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}
```

## Test Execution Performance

### Target Metrics
- **Unit tests**: < 5 seconds total (fast feedback loop)
- **Integration tests**: < 30 seconds total (multiple component interactions)
- **E2E tests**: < 2 minutes total (browser automation, server spawning)
- **Full suite**: < 3 minutes (acceptable for pre-commit hook)

### Performance Optimization
1. **Parallel execution**: Vitest runs tests in parallel by default
2. **In-memory mocks**: Avoid real filesystem/network operations in unit tests
3. **Shared fixtures**: Reuse mock NotebookLM server across E2E tests
4. **Fast browser launch**: Headless mode for tests (unless debugging)
5. **Selective test runs**: Use `vitest --changed` to run only affected tests

## Pitfalls and Mitigations

### Pitfall 1: Flaky E2E Tests from Browser Timing
**Problem:** E2E tests fail intermittently due to Playwright timing issues (elements not ready, async state).
**Mitigation:**
- Use Playwright's auto-waiting (`waitForSelector`, `waitForLoadState`)
- Add explicit waits for streaming completion
- Retry flaky tests with `test.retry(2)` in Vitest
- Mock NotebookLM UI for deterministic timing

### Pitfall 2: Coverage False Positives
**Problem:** High coverage percentage but critical edge cases untested.
**Mitigation:**
- Don't chase 100% coverage; focus on meaningful tests
- Per-file thresholds for critical paths (auth, backup, browser)
- Manual review of coverage reports for gaps
- Property-based testing for complex logic (e.g., `fast-check` library)

### Pitfall 3: Mock Drift from Real NotebookLM
**Problem:** Mock NotebookLM UI diverges from real UI, tests pass but prod fails.
**Mitigation:**
- Update mock UI when real NotebookLM changes (manual process)
- Include manual smoke tests with real NotebookLM in CI (Phase 8)
- Document mock UI version/last-updated date
- Use selector abstraction layer to minimize impact

### Pitfall 4: Slow E2E Tests
**Problem:** E2E tests take too long, slowing development feedback.
**Mitigation:**
- Parallelize E2E tests (Vitest workers)
- Use mock NotebookLM for most tests, real NotebookLM sparingly
- Optimize browser launch (reuse context across tests)
- Run E2E tests only in CI, not on every file save

### Pitfall 5: Test Environment Isolation
**Problem:** Tests interfere with each other (shared state, temp files).
**Mitigation:**
- Use unique temp directories per test (`mkdtempSync`)
- Clean up resources in `afterEach`/`afterAll` hooks
- Mock global singletons (don't use global state in application code)
- Run tests in isolated workers (Vitest default)

## Dependencies Between Tests

```
Phase 1 (Browser) modules → Unit tests (TEST-02 dependencies)
Phase 3 (Bidirectional) → Integration tests (TEST-06, TEST-07)
Phase 4 (MCP Server) → E2E test harness (TEST-08, TEST-09)
Phase 6 (Integration) → Mock NotebookLM UI (TEST-12)
```

**Recommendation:** Implement tests incrementally as modules complete. Unit tests can be written alongside implementation (TDD). Integration and E2E tests come after multi-phase integration.

## Verification Checklist

Before marking Phase 7 complete:

- [ ] All unit tests pass for auth, backup, config, degradation modules
- [ ] Integration tests validate auth flow and backup-restore flow
- [ ] E2E tests validate NotebookLM upload and error-to-resolution workflows
- [ ] Coverage reports show 80%+ on critical paths (auth, backup, browser, MCP tools)
- [ ] Mock NotebookLM UI implemented and tested
- [ ] Snapshot tests validate response parsing and report compilation
- [ ] Vitest config enforces coverage thresholds
- [ ] Test suite runs in < 3 minutes
- [ ] Tests are isolated (no shared state, proper cleanup)
- [ ] CI integration ready (scripts, reporting)

## Sources

### Vitest & Playwright Testing
- [Epic Web Dev: Vitest Browser Mode vs Playwright](https://www.epicweb.dev/vitest-browser-mode-vs-playwright)
- [BrowserStack: Vitest vs Playwright Guide](https://www.browserstack.com/guide/vitest-vs-playwright)
- [Vitest Browser Mode Guide](https://vitest.dev/guide/browser/)
- [Vitest Playwright Configuration](https://vitest.dev/config/browser/playwright)
- [DEV Community: Vitest vs Jest 30 - 2026 Testing](https://dev.to/dataformathub/vitest-vs-jest-30-why-2026-is-the-year-of-browser-native-testing-2fgb)
- [Maya Shavin: Component Testing with Vitest Browser Mode](https://mayashavin.com/articles/component-testing-browser-vitest)
- [The Koi: Run Playwright within Vitest](https://www.the-koi.com/projects/how-to-run-playwright-within-vitest/)
- [Steve Kinney: Cross-Browser Testing with Playwright](https://stevekinney.com/courses/testing/cross-browser-testing-with-playwright)
- [DEV Community: TypeScript Testing Frameworks 2026](https://dev.to/agent-tools-dev/choosing-a-typescript-testing-framework-jest-vs-vitest-vs-playwright-vs-cypress-2026-7j9)

### MCP Server Testing Patterns
- [MCPcat: MCP Integration Testing Guide](https://mcpcat.io/guides/integration-tests-mcp-flows/)
- [Medium: AI Powered E2E Testing with Playwright MCP](https://kailash-pathak.medium.com/ai-powered-e2e-testing-with-playwright-mcp-model-context-protocol-and-github-mcp-d5ead640e82c)
- [GitHub: Claude Code MCP E2E Testing](https://github.com/steipete/claude-code-mcp/blob/main/docs/e2e-testing.md)
- [MCP Jam: E2E Testing for MCP Servers](https://mcpjam.substack.com/p/thoughts-on-e2e-testing-for-mcp-servers)
- [Aaseya: MCP Servers Transform E2E Testing](https://aaseya.com/blogs/how-mcp-servers-will-transform-end-to-end-e2e-testing/)
- [LobeHub: AI-Powered E2E Test Framework](https://lobehub.com/mcp/your-org-ai-e2e-test-framework)
- [GitHub: MCP E2E Testing Example](https://github.com/mkusaka/mcp-server-e2e-testing-example)
- [MCPcat: Unit Testing MCP Servers](https://mcpcat.io/guides/writing-unit-tests-mcp-servers/)
- [MCP.so: E2E Tests MCP Server](https://mcp.so/server/e2e-mcp)

### Coverage & Best Practices
- [Vitest Coverage Guide](https://vitest.dev/guide/coverage)
- [V8 Coverage Documentation](https://v8.dev/blog/javascript-code-coverage)
- [Testing Best Practices (general)](https://testingjavascript.com/)

---

**Next Steps:** Proceed to planning Phase 7 tasks based on this research. Prioritize unit tests for critical modules (auth, backup, config, degradation) first, then integration tests, then E2E infrastructure.
