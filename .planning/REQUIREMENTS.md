# Requirements: MSW Protocol

**Defined:** 2026-02-02
**Core Value:** Zero manual copy-paste between NotebookLM and coding agents

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Browser Automation

- [x] **BROW-01**: Persistent Chrome profile maintains NotebookLM authentication across sessions
- [x] **BROW-02**: Playwright driver navigates to NotebookLM and connects to specified notebook
- [x] **BROW-03**: Humanized automation with stealth mode and human-like typing/click delays
- [x] **BROW-04**: Bot detection mitigation via dedicated automation account strategy
- [x] **BROW-05**: Resilient selector layer using accessibility tree and semantic selectors
- [x] **BROW-06**: Response extraction waits for streaming completion before parsing

### Auto-Conversation Engine

- [x] **AUTO-01**: Topic detection finds all suggested topic pills in NotebookLM UI
- [x] **AUTO-02**: Auto-click triggers detected topics and extracts responses
- [x] **AUTO-03**: Multi-level expansion continues up to 10 levels until no new relevant topics
- [x] **AUTO-04**: Relevance scoring (0-100) via local LLM evaluates each topic before clicking
- [x] **AUTO-05**: Configurable relevance threshold (default: 30) filters low-value topics
- [x] **AUTO-06**: Query batching optimizes within NotebookLM's 50 queries/day limit
- [x] **AUTO-07**: Rate limit tracking warns before approaching daily quota

### Bidirectional Communication

- [x] **BIDR-01**: Query injection types questions into NotebookLM chat input
- [x] **BIDR-02**: Agent error bridge captures coding agent errors and formats for NotebookLM
- [x] **BIDR-03**: Response extraction parses NotebookLM answers with source citations
- [x] **BIDR-04**: Answer chain compilation aggregates multi-turn conversations
- [x] **BIDR-05**: Query deduplication prevents repeating identical questions
- [x] **BIDR-06**: Rich error templates structure error context for effective queries
- [x] **BIDR-07**: Context injection passes NotebookLM answers back to coding agent

### Knowledge Persistence

- [x] **KNOW-01**: Report compiler converts Q&A pairs to structured markdown
- [x] **KNOW-02**: Git commit research artifacts to `.msw/research/` directory
- [x] **KNOW-03**: Metadata tracking records source notebook, timestamp, relevance scores
- [x] **KNOW-04**: Decision traceability links code changes to research findings

### MCP Server

- [x] **MCP-01**: Server exposes tools via MCP SDK stdio transport
- [x] **MCP-02**: `msw_init` tool initializes MSW for a project directory
- [x] **MCP-03**: `msw_research` tool triggers NotebookLM extraction session
- [x] **MCP-04**: `msw_plan` tool generates PRD from research findings
- [x] **MCP-05**: `msw_execute` tool runs Ralph loop with NotebookLM feedback
- [x] **MCP-06**: `msw_verify` tool confirms implementation against requirements
- [x] **MCP-07**: `msw_status` tool reports current progress and state
- [x] **MCP-08**: `msw_notebook_add` tool adds notebooks to library
- [x] **MCP-09**: Long-running operations return job IDs with polling support
- [x] **MCP-10**: Compatible with Claude Code, Windsurf, and Cursor

### GSD Integration

- [x] **GSD-01**: State persistence via STATE.md, ROADMAP.md, PROJECT.md files
- [x] **GSD-02**: Research-grounded planning injects NotebookLM findings into PRD generation
- [x] **GSD-03**: Phase plans include references to supporting research
- [x] **GSD-04**: GSD format adapter translates between MSW and GSD XML task structure

### Ralph Loop Integration

- [x] **RALPH-01**: Stop hook intercepts agent exit attempts
- [x] **RALPH-02**: Iteration tracking counts attempts and respects max-iterations
- [x] **RALPH-03**: NotebookLM feedback queries research on detected failures
- [x] **RALPH-04**: Context injection prepends NotebookLM guidance to next iteration
- [x] **RALPH-05**: Completion detection checks for success criteria before stopping
- [x] **RALPH-06**: Behavioral verification validates actual functionality, not just structure

### Automated Testing

- [x] **TEST-01**: Unit test infrastructure using Vitest with coverage reporting
- [x] **TEST-02**: Auth module tests cover token validation, session persistence, logout detection
- [x] **TEST-03**: Backup module tests cover state serialization, restoration, corruption recovery
- [x] **TEST-04**: Config module tests cover validation, schema enforcement, defaults handling
- [x] **TEST-05**: Degradation module tests cover offline mode, cache behavior, recovery
- [x] **TEST-06**: Integration tests for authentication flow (login, persist, restore)
- [x] **TEST-07**: Integration tests for backup-restore flow (save, corrupt, recover)
- [x] **TEST-08**: E2E test for full NotebookLM upload workflow (init, query, extract, commit)
- [x] **TEST-09**: E2E test for error-to-resolution pipeline (error detection, NotebookLM query, fix injection)
- [x] **TEST-10**: Test coverage reporting with 80%+ critical path coverage target
- [x] **TEST-11**: Snapshot testing for response parsing and markdown compilation
- [x] **TEST-12**: Mock NotebookLM UI for deterministic selector testing

### CI/CD Pipeline

- [x] **CI-01**: GitHub Actions workflow runs tests on every commit
- [x] **CI-02**: Multi-Node version testing matrix (Node 18, 20, 22)
- [x] **CI-03**: TypeScript type checking in CI pipeline
- [x] **CI-04**: Linting enforcement (ESLint + Prettier) on every PR
- [x] **CI-05**: Build verification ensures distribution artifacts are valid
- [x] **CI-06**: E2E health check runs against live NotebookLM sandbox account
- [x] **CI-07**: Automated validation rejects PRs that break critical tests
- [x] **CI-08**: Coverage regression detection (fail if coverage drops below threshold)
- [x] **CI-09**: Security scanning for dependency vulnerabilities
- [x] **CI-10**: Automated release tagging and changelog generation

### Production Hardening

- [x] **HARD-01**: Structured logging via Pino to `.msw/logs/` with rotation
- [x] **HARD-02**: Log levels configurable (debug, info, warn, error) with environment variable
- [x] **HARD-03**: Rate limiting handler tracks NotebookLM requests and warns before quota
- [x] **HARD-04**: Rate limit dashboard shows current usage, remaining quota, reset time
- [x] **HARD-05**: Interactive demo mode for new users with guided workflow
- [x] **HARD-06**: Demo mode uses sample notebook with safe fallback if unavailable
- [x] **HARD-07**: Self-healing diagnostics detect common issues (Chrome profile lock, selector failures)
- [x] **HARD-08**: Auto-fix common issues (unlock Chrome profile, refresh selectors, restart browser)
- [x] **HARD-09**: Performance metrics tracking (query timing, response time, cache hit rate)
- [x] **HARD-10**: Metrics export to JSON for analysis and monitoring
- [x] **HARD-11**: Session management dashboard shows active operations, progress, cancel option
- [x] **HARD-12**: Session persistence across crashes with resumption support
- [x] **HARD-13**: Graceful degradation when NotebookLM is unavailable (use cached responses)
- [x] **HARD-14**: Health check endpoint exposes system status (browser ready, notebook connected, quota remaining)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Multi-Notebook

- **MULTI-01**: Notebook library management with multiple NotebookLM notebooks
- **MULTI-02**: Auto-routing selects best notebook based on query topic
- **MULTI-03**: Cross-notebook synthesis combines answers from multiple sources

### Advanced Features

- **ADV-01**: Custom relevance models trained on user's domain
- **ADV-02**: Parallel topic exploration (multiple browser contexts)
- **ADV-03**: Streamable HTTP transport for remote MCP deployment
- **ADV-04**: Multi-account rotation for rate limit scaling

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Web UI for notebook management | CLI/MCP-first for power users; adds security surface and complexity |
| Non-MCP CLI-only mode | MCP is the standard; fragmenting codebase doubles maintenance |
| Audio/podcast features | NotebookLM's job, not MSW's; irrelevant to coding agents |
| Full autonomy without guardrails | Security risk; always include max iterations, timeouts, checkpoints |
| Storing credentials in config | Security violation; Chrome profile handles auth |
| Real-time streaming without buffering | Causes partial data; wait for streaming completion |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BROW-01 | Phase 1 | Complete |
| BROW-02 | Phase 1 | Complete |
| BROW-03 | Phase 1 | Complete |
| BROW-04 | Phase 1 | Complete |
| BROW-05 | Phase 1 | Complete |
| BROW-06 | Phase 1 | Complete |
| AUTO-01 | Phase 2 | Complete |
| AUTO-02 | Phase 2 | Complete |
| AUTO-03 | Phase 2 | Complete |
| AUTO-04 | Phase 2 | Complete |
| AUTO-05 | Phase 2 | Complete |
| AUTO-06 | Phase 2 | Complete |
| AUTO-07 | Phase 2 | Complete |
| BIDR-01 | Phase 3 | Complete |
| BIDR-02 | Phase 3 | Complete |
| BIDR-03 | Phase 3 | Complete |
| BIDR-04 | Phase 3 | Complete |
| BIDR-05 | Phase 3 | Complete |
| BIDR-06 | Phase 3 | Complete |
| BIDR-07 | Phase 3 | Complete |
| KNOW-01 | Phase 3 | Complete |
| KNOW-02 | Phase 3 | Complete |
| KNOW-03 | Phase 3 | Complete |
| KNOW-04 | Phase 3 | Complete |
| MCP-01 | Phase 4 | Complete |
| MCP-02 | Phase 4 | Complete |
| MCP-03 | Phase 4 | Complete |
| MCP-04 | Phase 4 | Complete |
| MCP-05 | Phase 4 | Complete |
| MCP-06 | Phase 4 | Complete |
| MCP-07 | Phase 4 | Complete |
| MCP-08 | Phase 4 | Complete |
| MCP-09 | Phase 4 | Complete |
| MCP-10 | Phase 4 | Complete |
| GSD-01 | Phase 5 | Complete |
| GSD-02 | Phase 5 | Complete |
| GSD-03 | Phase 5 | Complete |
| GSD-04 | Phase 5 | Complete |
| RALPH-01 | Phase 5 | Complete |
| RALPH-02 | Phase 5 | Complete |
| RALPH-03 | Phase 5 | Complete |
| RALPH-04 | Phase 5 | Complete |
| RALPH-05 | Phase 5 | Complete |
| RALPH-06 | Phase 5 | Complete |
| TEST-01 | Phase 7 | Pending |
| TEST-02 | Phase 7 | Pending |
| TEST-03 | Phase 7 | Pending |
| TEST-04 | Phase 7 | Pending |
| TEST-05 | Phase 7 | Pending |
| TEST-06 | Phase 7 | Pending |
| TEST-07 | Phase 7 | Pending |
| TEST-08 | Phase 7 | Pending |
| TEST-09 | Phase 7 | Pending |
| TEST-10 | Phase 7 | Pending |
| TEST-11 | Phase 7 | Pending |
| TEST-12 | Phase 7 | Pending |
| CI-01 | Phase 8 | Pending |
| CI-02 | Phase 8 | Pending |
| CI-03 | Phase 8 | Pending |
| CI-04 | Phase 8 | Pending |
| CI-05 | Phase 8 | Pending |
| CI-06 | Phase 8 | Pending |
| CI-07 | Phase 8 | Pending |
| CI-08 | Phase 8 | Pending |
| CI-09 | Phase 8 | Pending |
| CI-10 | Phase 8 | Pending |
| HARD-01 | Phase 9 | Complete |
| HARD-02 | Phase 9 | Complete |
| HARD-03 | Phase 9 | Complete |
| HARD-04 | Phase 9 | Complete |
| HARD-05 | Phase 9 | Complete |
| HARD-06 | Phase 9 | Complete |
| HARD-07 | Phase 9 | Complete |
| HARD-08 | Phase 9 | Complete |
| HARD-09 | Phase 9 | Complete |
| HARD-10 | Phase 9 | Complete |
| HARD-11 | Phase 9 | Complete |
| HARD-12 | Phase 9 | Complete |
| HARD-13 | Phase 9 | Complete |
| HARD-14 | Phase 9 | Complete |

**Coverage:**
- v1 requirements: 79 total
- Mapped to phases: 79 (Phases 1-9)
- Unmapped: 0
- Phase 6: Integration phase (validates core requirements, introduces no new ones)
- Phases 7-9: Production hardening (36 new requirements)

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-03 after adding production hardening phases*
