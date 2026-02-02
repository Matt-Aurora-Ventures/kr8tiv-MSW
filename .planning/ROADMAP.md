# Roadmap: MSW Protocol

## Overview

MSW Protocol delivers an autonomous coding system that bridges NotebookLM and coding agents. The journey starts with browser automation (the highest-risk blocking dependency), builds the Auto-Conversation Engine (core differentiator), adds bidirectional communication and knowledge persistence, wraps everything in an MCP server, integrates with GSD and Ralph execution patterns, and culminates in end-to-end integration testing. Each phase delivers a complete, verifiable capability that unlocks the next.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4, 5, 6): Planned milestone work
- Decimal phases (e.g., 2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Browser Automation Foundation** - Playwright wrapper with stealth, Chrome profile persistence, NotebookLM connection
- [ ] **Phase 2: Auto-Conversation Engine** - Topic detection, relevance scoring, multi-level expansion, Q&A extraction
- [ ] **Phase 3: Bidirectional Communication** - Query injection, response extraction, knowledge persistence
- [ ] **Phase 4: MCP Server** - Tool handlers wrapping all engines, multi-client compatibility
- [ ] **Phase 5: GSD + Ralph Integration** - Research-grounded planning and continuous execution with feedback
- [ ] **Phase 6: End-to-End Integration** - Full workflow validation, production hardening, documentation

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
**Plans**: TBD

Plans:
- [ ] 02-01: Topic pill detection and extraction
- [ ] 02-02: Topic click automation with response capture
- [ ] 02-03: Multi-level topic expansion with depth tracking
- [ ] 02-04: Local LLM relevance scoring integration
- [ ] 02-05: Configurable relevance threshold filtering
- [ ] 02-06: Query batching and rate limit tracking

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
**Plans**: TBD

Plans:
- [ ] 03-01: Query injection into NotebookLM chat input
- [ ] 03-02: Agent error bridge with rich context templates
- [ ] 03-03: Response extraction with source citation parsing
- [ ] 03-04: Query deduplication and answer chain compilation
- [ ] 03-05: Context injection back to coding agent
- [ ] 03-06: Report compiler with markdown generation
- [ ] 03-07: Git commit integration with metadata tracking
- [ ] 03-08: Decision traceability linking

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
**Plans**: TBD

Plans:
- [ ] 04-01: MCP server scaffold with stdio transport
- [ ] 04-02: Tool handler layer foundation
- [ ] 04-03: msw_init and msw_status tools
- [ ] 04-04: msw_research tool with engine integration
- [ ] 04-05: msw_plan and msw_execute tools
- [ ] 04-06: msw_verify and msw_notebook_add tools
- [ ] 04-07: Long-running operation polling
- [ ] 04-08: Multi-client compatibility testing

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
**Plans**: TBD

Plans:
- [ ] 05-01: GSD state persistence layer
- [ ] 05-02: Research-grounded PRD generation
- [ ] 05-03: GSD format adapter (MSW to GSD XML)
- [ ] 05-04: Ralph stop hook implementation (cross-platform)
- [ ] 05-05: Iteration tracking and max-iterations enforcement
- [ ] 05-06: NotebookLM feedback on failures
- [ ] 05-07: Context injection for next iteration
- [ ] 05-08: Behavioral verification system

### Phase 6: End-to-End Integration
**Goal**: Full workflow validation from error detection to resolution, production hardening, and documentation
**Depends on**: Phase 5 (requires all previous phases complete)
**Requirements**: (Integration of all prior requirements - no new REQ-IDs)
**Success Criteria** (what must be TRUE):
  1. Complete error-to-resolution pipeline works: agent error triggers NotebookLM query, answer is injected, agent applies fix
  2. E2E test suite covers critical paths and runs in CI
  3. Configuration documentation enables new users to set up MSW from scratch
  4. Crash recovery restores state and resumes operation after unexpected termination
**Plans**: TBD

Plans:
- [ ] 06-01: End-to-end pipeline integration
- [ ] 06-02: E2E test suite development
- [ ] 06-03: Crash recovery and state restoration
- [ ] 06-04: Configuration and deployment documentation
- [ ] 06-05: Performance optimization and hardening

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6
(Decimal phases, if inserted, execute between their surrounding integers)

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Browser Automation Foundation | 0/6 | Planned (4 waves) | - |
| 2. Auto-Conversation Engine | 0/6 | Not started | - |
| 3. Bidirectional Communication | 0/8 | Not started | - |
| 4. MCP Server | 0/8 | Not started | - |
| 5. GSD + Ralph Integration | 0/8 | Not started | - |
| 6. End-to-End Integration | 0/5 | Not started | - |

---
*Roadmap created: 2026-02-02*
*Depth: comprehensive (6 phases, 41 plans)*
