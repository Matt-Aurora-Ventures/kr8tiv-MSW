# Roadmap: MSW Protocol

## Overview

MSW Protocol delivers an autonomous coding system that bridges NotebookLM and coding agents. The journey starts with browser automation (the highest-risk blocking dependency), builds the Auto-Conversation Engine (core differentiator), adds bidirectional communication and knowledge persistence, wraps everything in an MCP server, integrates with GSD and Ralph execution patterns, validates end-to-end integration, and culminates with production hardening through comprehensive testing, CI/CD automation, and operational excellence features. Each phase delivers a complete, verifiable capability that unlocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4, 5, 6, 7, 8, 9): Planned milestone work
- Decimal phases (e.g., 2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Browser Automation Foundation** - Playwright wrapper with stealth, Chrome profile persistence, NotebookLM connection
- [x] **Phase 2: Auto-Conversation Engine** - Topic detection, relevance scoring, multi-level expansion, Q&A extraction
- [x] **Phase 3: Bidirectional Communication** - Query injection, response extraction, knowledge persistence
- [x] **Phase 4: MCP Server** - Tool handlers wrapping all engines, multi-client compatibility
- [x] **Phase 5: GSD + Ralph Integration** - Research-grounded planning and continuous execution with feedback
- [x] **Phase 6: End-to-End Integration** - Full workflow validation, production hardening, documentation
- [x] **Phase 7: Automated Testing Suite** - Unit, integration, and E2E tests with 80%+ coverage
- [x] **Phase 8: CI/CD Pipeline** - GitHub Actions automation with multi-Node validation
- [x] **Phase 9: Production Hardening** - Structured logging, rate limiting, demo mode, self-healing diagnostics

## Phase Details

### Phase 1: Browser Automation Foundation
**Goal**: Reliable, stealthy browser automation that can connect to NotebookLM and maintain sessions across restarts
**Depends on**: Nothing (first phase)
**Requirements**: BROW-01, BROW-02, BROW-03, BROW-04, BROW-05, BROW-06
**Success Criteria** (what must be TRUE):
  1. Browser launches with persistent Chrome profile and user remains logged into NotebookLM across process restarts
  2. Playwright can navigate to a specified notebook URL and the UI is ready for interaction
  3. Automation passes basic bot detection (no CAPTCHA triggers, no logout cascades) with humanized delays
  4. Selectors find NotebookLM UI elements via semantic/accessibility tree methods, not brittle CSS classes
  5. Response extraction correctly waits for streaming completion before returning content
**Plans:** 6 plans in 4 waves

Plans:
- [ ] 01-01-PLAN.md — Project scaffold + Playwright driver + stealth config (Wave 1)
- [ ] 01-02-PLAN.md — Chrome profile persistence + single-instance locking (Wave 1)
- [ ] 01-03-PLAN.md — NotebookLM navigator + connection detection (Wave 2)
- [ ] 01-04-PLAN.md — Semantic selector registry + humanization utilities (Wave 2)
- [ ] 01-05-PLAN.md — Streaming completion detection + response extraction (Wave 3)
- [ ] 01-06-PLAN.md — Barrel exports + build verification + smoke test (Wave 4)

### Phase 2: Auto-Conversation Engine
**Goal**: Automatic exploration of NotebookLM suggested topics with relevance filtering to build comprehensive research
**Depends on**: Phase 1 (browser automation required)
**Requirements**: AUTO-01, AUTO-02, AUTO-03, AUTO-04, AUTO-05, AUTO-06, AUTO-07
**Success Criteria** (what must be TRUE):
  1. System detects all suggested topic pills currently visible in NotebookLM UI
  2. Clicking a topic triggers the question and extracts the response with source citations
  3. Multi-level expansion continues through at least 5 levels of suggested topics until no new relevant topics appear
  4. Local LLM relevance scoring (0-100) filters out low-value topics before clicking
  5. Rate limit tracking displays warning when approaching 50 queries/day and batches queries intelligently
**Plans**: 6 plans in 3 waves

Plans:
- [ ] 02-01-PLAN.md — Topic pill detection and extraction (Wave 1)
- [ ] 02-02-PLAN.md — Topic click automation with response capture (Wave 1)
- [ ] 02-03-PLAN.md — Multi-level topic expansion with depth tracking (Wave 2)
- [ ] 02-04-PLAN.md — Local LLM relevance scoring integration (Wave 2)
- [ ] 02-05-PLAN.md — Configurable relevance threshold filtering (Wave 2)
- [ ] 02-06-PLAN.md — Query batching and rate limit tracking (Wave 3)

### Phase 3: Bidirectional Communication + Knowledge Persistence
**Goal**: Two-way bridge where agent errors flow to NotebookLM and grounded answers flow back, with all Q&A persisted to git
**Depends on**: Phase 2 (extraction and query capabilities required)
**Requirements**: BIDR-01, BIDR-02, BIDR-03, BIDR-04, BIDR-05, BIDR-06, BIDR-07, KNOW-01, KNOW-02, KNOW-03, KNOW-04
**Success Criteria** (what must be TRUE):
  1. User can inject arbitrary questions into NotebookLM chat and receive structured responses
  2. Coding agent errors are automatically formatted with context and sent to NotebookLM for research
  3. Query deduplication prevents asking the same question twice in a session
  4. NotebookLM answers are injected back into coding agent context with source attribution
  5. All Q&A pairs are compiled to markdown and committed to `.msw/research/` with metadata
**Plans:** 6 plans in 3 waves

Plans:
- [ ] 03-01-PLAN.md — Types + QueryInjector + Deduplication (Wave 1)
- [ ] 03-02-PLAN.md — Error Bridge + Error Templates (Wave 1)
- [ ] 03-03-PLAN.md — Response Parser + Answer Chain (Wave 1)
- [ ] 03-04-PLAN.md — Context Injector + Report Compiler + Metadata (Wave 2)
- [ ] 03-05-PLAN.md — Git Manager + Traceability (Wave 2)
- [ ] 03-06-PLAN.md — Barrel exports + build verification (Wave 3)

### Phase 4: MCP Server
**Goal**: MCP server exposing all MSW capabilities as tools compatible with Claude Code, Windsurf, and Cursor
**Depends on**: Phase 3 (requires core engines to wrap)
**Requirements**: MCP-01, MCP-02, MCP-03, MCP-04, MCP-05, MCP-06, MCP-07, MCP-08, MCP-09, MCP-10
**Success Criteria** (what must be TRUE):
  1. MCP server starts via stdio transport and responds to tool discovery requests
  2. `msw_init` tool initializes MSW state for a project directory
  3. `msw_research` tool triggers NotebookLM extraction and returns results or job ID
  4. Long-running operations return job IDs that can be polled for status and results
  5. Server works identically in Claude Code, Windsurf, and Cursor as MCP clients
**Plans:** 8 plans in 4 waves

Plans:
- [ ] 04-01-PLAN.md — MCP server scaffold with stdio transport (Wave 1)
- [ ] 04-02-PLAN.md — Job manager and tool registration infrastructure (Wave 1)
- [ ] 04-03-PLAN.md — msw_init and msw_status tools (Wave 2)
- [ ] 04-04-PLAN.md — msw_research tool with job ID pattern (Wave 2)
- [ ] 04-05-PLAN.md — msw_plan and msw_execute tools (Wave 2)
- [ ] 04-06-PLAN.md — msw_verify and msw_notebook_add tools (Wave 2)
- [ ] 04-07-PLAN.md — Wire all tools + end-to-end job flow (Wave 3)
- [ ] 04-08-PLAN.md — Multi-client compatibility testing (Wave 4)

### Phase 5: GSD + Ralph Integration
**Goal**: Research-grounded planning via GSD Protocol and continuous execution via Ralph Loop with NotebookLM feedback on failures
**Depends on**: Phase 4 (requires MCP tools for coordination)
**Requirements**: GSD-01, GSD-02, GSD-03, GSD-04, RALPH-01, RALPH-02, RALPH-03, RALPH-04, RALPH-05, RALPH-06
**Success Criteria** (what must be TRUE):
  1. GSD state files (STATE.md, ROADMAP.md, PROJECT.md) are created and maintained by MSW
  2. PRD generation includes references to NotebookLM research findings
  3. Stop hook prevents premature agent exit and iteration tracking respects max-iterations
  4. Failures trigger automatic NotebookLM queries and inject guidance into next iteration
  5. Behavioral verification validates actual functionality (not just code structure) before marking complete
**Plans:** 8 plans in 4 waves

Plans:
- [ ] 05-01-PLAN.md — GSD state persistence types + state-manager (Wave 1)
- [ ] 05-02-PLAN.md — GSD XML format adapter (Wave 1)
- [ ] 05-03-PLAN.md — Ralph execution types + iteration tracker (Wave 1)
- [ ] 05-04-PLAN.md — Ralph stop hook script (Wave 2)
- [ ] 05-05-PLAN.md — Research-grounded PRD generator (Wave 2)
- [ ] 05-06-PLAN.md — Feedback injector + completion detector (Wave 2)
- [ ] 05-07-PLAN.md — Ralph runner + behavioral verifier (Wave 3)
- [ ] 05-08-PLAN.md — Barrel exports + build verification (Wave 4)

### Phase 6: End-to-End Integration
**Goal**: Full workflow validation from error detection to resolution, production hardening, and documentation
**Depends on**: Phase 5 (requires all previous phases complete)
**Requirements**: (Integration of all prior requirements - no new REQ-IDs)
**Success Criteria** (what must be TRUE):
  1. Complete error-to-resolution pipeline works: agent error triggers NotebookLM query, answer is injected, agent applies fix
  2. E2E test suite covers critical paths and runs in CI
  3. Configuration documentation enables new users to set up MSW from scratch
  4. Crash recovery restores state and resumes operation after unexpected termination
**Plans:** 5 plans in 3 waves

Plans:
- [ ] 06-01-PLAN.md — Wire MCP tools to real engine implementations (Wave 1)
- [ ] 06-02-PLAN.md — Config validation + health checks + crash recovery state (Wave 1)
- [ ] 06-03-PLAN.md — E2E test infrastructure and MCP smoke tests (Wave 2)
- [ ] 06-04-PLAN.md — Pipeline orchestrator with crash recovery (Wave 2)
- [ ] 06-05-PLAN.md — Barrel exports + SETUP.md documentation (Wave 3)

### Phase 7: Automated Testing Suite
**Goal**: Comprehensive test coverage across unit, integration, and E2E levels with 80%+ coverage on critical paths
**Depends on**: Phase 6 (requires complete system for E2E testing)
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08, TEST-09, TEST-10, TEST-11, TEST-12
**Success Criteria** (what must be TRUE):
  1. Unit tests cover all core modules (auth, backup, config, degradation) with mocked dependencies
  2. Integration tests validate multi-component workflows (auth flow, backup-restore flow)
  3. E2E tests validate complete user workflows (NotebookLM upload, error-to-resolution pipeline)
  4. Test coverage reports show 80%+ coverage on critical paths (browser automation, MCP tools, execution engines)
  5. Mock NotebookLM UI enables deterministic testing without live NotebookLM dependency
**Plans:** 6 plans in 3 waves

Plans:
- [ ] 07-01-PLAN.md — Vitest infrastructure + coverage reporting (Wave 1)
- [ ] 07-02-PLAN.md — Unit tests: auth, backup, config, degradation modules (Wave 1)
- [ ] 07-03-PLAN.md — Mock NotebookLM UI + selector test fixtures (Wave 2)
- [ ] 07-04-PLAN.md — Integration tests: auth flow, backup-restore flow (Wave 2)
- [ ] 07-05-PLAN.md — E2E tests: NotebookLM upload, error-to-resolution pipeline (Wave 2)
- [ ] 07-06-PLAN.md — Snapshot testing + coverage validation (Wave 3)

### Phase 8: CI/CD Pipeline
**Goal**: Automated build, test, and validation pipeline with multi-Node version support and PR quality gates
**Depends on**: Phase 7 (requires test suite to automate)
**Requirements**: CI-01, CI-02, CI-03, CI-04, CI-05, CI-06, CI-07, CI-08, CI-09, CI-10
**Success Criteria** (what must be TRUE):
  1. GitHub Actions workflow runs on every commit and PR with build, test, lint, and type-check steps
  2. Multi-Node version matrix (18, 20, 22) validates compatibility across LTS versions
  3. PRs failing critical tests, type checks, or linting are automatically rejected
  4. Coverage regression detection prevents merging PRs that reduce test coverage below threshold
  5. Automated release process tags versions and generates changelogs from commit history
**Plans:** 5 plans in 3 waves

Plans:
- [ ] 08-01-PLAN.md — GitHub Actions workflow scaffold + Node matrix (Wave 1)
- [ ] 08-02-PLAN.md — Build verification + TypeScript type checking (Wave 1)
- [ ] 08-03-PLAN.md — Linting + formatting enforcement (Wave 2)
- [ ] 08-04-PLAN.md — Coverage regression + security scanning (Wave 2)
- [ ] 08-05-PLAN.md — Automated release tagging + changelog generation (Wave 3)

### Phase 9: Production Hardening
**Goal**: Operational excellence through structured logging, rate limiting, demo mode, self-healing diagnostics, and session management
**Depends on**: Phase 8 (requires CI/CD for continuous validation of production features)
**Requirements**: HARD-01, HARD-02, HARD-03, HARD-04, HARD-05, HARD-06, HARD-07, HARD-08, HARD-09, HARD-10, HARD-11, HARD-12, HARD-13, HARD-14
**Success Criteria** (what must be TRUE):
  1. Structured logs via Pino are written to `.msw/logs/` with rotation and configurable log levels
  2. Rate limiting handler tracks NotebookLM requests, warns before quota, and displays dashboard with usage/remaining/reset
  3. Interactive demo mode guides new users through setup with sample notebook and safe fallback
  4. Self-healing diagnostics detect common issues (Chrome profile lock, selector failures) and auto-fix when possible
  5. Session management dashboard shows active operations with progress tracking and cancellation support
**Plans:** 7 plans in 4 waves

Plans:
- [ ] 09-01-PLAN.md — Structured logging infrastructure with Pino + log rotation (Wave 1)
- [ ] 09-02-PLAN.md — Rate limiting handler + usage dashboard (Wave 1)
- [ ] 09-03-PLAN.md — Interactive demo mode + sample notebook fallback (Wave 2)
- [ ] 09-04-PLAN.md — Self-healing diagnostics + auto-fix handlers (Wave 2)
- [ ] 09-05-PLAN.md — Performance metrics tracking + JSON export (Wave 2)
- [ ] 09-06-PLAN.md — Session management dashboard + crash resumption (Wave 3)
- [ ] 09-07-PLAN.md — Production infrastructure integration (Wire all modules) (Wave 4)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9
(Decimal phases, if inserted, execute between their surrounding integers)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Browser Automation Foundation | 6/6 | ✓ Complete | 2026-02-03 |
| 2. Auto-Conversation Engine | 6/6 | ✓ Complete | 2026-02-02 |
| 3. Bidirectional Communication | 6/6 | ✓ Complete | 2026-02-02 |
| 4. MCP Server | 8/8 | ✓ Complete | 2026-02-02 |
| 5. GSD + Ralph Integration | 8/8 | ✓ Complete | 2026-02-03 |
| 6. End-to-End Integration | 5/5 | ✓ Complete | 2026-02-03 |
| 7. Automated Testing Suite | 6/6 | ✓ Complete | 2026-02-03 |
| 8. CI/CD Pipeline | 5/5 | ✓ Complete | 2026-02-03 |
| 9. Production Hardening | 7/7 | ✓ Complete | 2026-02-04 |

---
*Roadmap created: 2026-02-02*
*Extended: 2026-02-03 with production hardening phases (7, 8, 9)*
*Depth: comprehensive (9 phases, 56 plans)*
