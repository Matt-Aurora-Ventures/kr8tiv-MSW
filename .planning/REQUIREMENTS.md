# Requirements: MSW Protocol

**Defined:** 2026-02-02
**Core Value:** Zero manual copy-paste between NotebookLM and coding agents

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Browser Automation

- [ ] **BROW-01**: Persistent Chrome profile maintains NotebookLM authentication across sessions
- [ ] **BROW-02**: Playwright driver navigates to NotebookLM and connects to specified notebook
- [ ] **BROW-03**: Humanized automation with stealth mode and human-like typing/click delays
- [ ] **BROW-04**: Bot detection mitigation via dedicated automation account strategy
- [ ] **BROW-05**: Resilient selector layer using accessibility tree and semantic selectors
- [ ] **BROW-06**: Response extraction waits for streaming completion before parsing

### Auto-Conversation Engine

- [ ] **AUTO-01**: Topic detection finds all suggested topic pills in NotebookLM UI
- [ ] **AUTO-02**: Auto-click triggers detected topics and extracts responses
- [ ] **AUTO-03**: Multi-level expansion continues up to 10 levels until no new relevant topics
- [ ] **AUTO-04**: Relevance scoring (0-100) via local LLM evaluates each topic before clicking
- [ ] **AUTO-05**: Configurable relevance threshold (default: 30) filters low-value topics
- [ ] **AUTO-06**: Query batching optimizes within NotebookLM's 50 queries/day limit
- [ ] **AUTO-07**: Rate limit tracking warns before approaching daily quota

### Bidirectional Communication

- [ ] **BIDR-01**: Query injection types questions into NotebookLM chat input
- [ ] **BIDR-02**: Agent error bridge captures coding agent errors and formats for NotebookLM
- [ ] **BIDR-03**: Response extraction parses NotebookLM answers with source citations
- [ ] **BIDR-04**: Answer chain compilation aggregates multi-turn conversations
- [ ] **BIDR-05**: Query deduplication prevents repeating identical questions
- [ ] **BIDR-06**: Rich error templates structure error context for effective queries
- [ ] **BIDR-07**: Context injection passes NotebookLM answers back to coding agent

### Knowledge Persistence

- [ ] **KNOW-01**: Report compiler converts Q&A pairs to structured markdown
- [ ] **KNOW-02**: Git commit research artifacts to `.msw/research/` directory
- [ ] **KNOW-03**: Metadata tracking records source notebook, timestamp, relevance scores
- [ ] **KNOW-04**: Decision traceability links code changes to research findings

### MCP Server

- [ ] **MCP-01**: Server exposes tools via MCP SDK stdio transport
- [ ] **MCP-02**: `msw_init` tool initializes MSW for a project directory
- [ ] **MCP-03**: `msw_research` tool triggers NotebookLM extraction session
- [ ] **MCP-04**: `msw_plan` tool generates PRD from research findings
- [ ] **MCP-05**: `msw_execute` tool runs Ralph loop with NotebookLM feedback
- [ ] **MCP-06**: `msw_verify` tool confirms implementation against requirements
- [ ] **MCP-07**: `msw_status` tool reports current progress and state
- [ ] **MCP-08**: `msw_notebook_add` tool adds notebooks to library
- [ ] **MCP-09**: Long-running operations return job IDs with polling support
- [ ] **MCP-10**: Compatible with Claude Code, Windsurf, and Cursor

### GSD Integration

- [ ] **GSD-01**: State persistence via STATE.md, ROADMAP.md, PROJECT.md files
- [ ] **GSD-02**: Research-grounded planning injects NotebookLM findings into PRD generation
- [ ] **GSD-03**: Phase plans include references to supporting research
- [ ] **GSD-04**: GSD format adapter translates between MSW and GSD XML task structure

### Ralph Loop Integration

- [ ] **RALPH-01**: Stop hook intercepts agent exit attempts
- [ ] **RALPH-02**: Iteration tracking counts attempts and respects max-iterations
- [ ] **RALPH-03**: NotebookLM feedback queries research on detected failures
- [ ] **RALPH-04**: Context injection prepends NotebookLM guidance to next iteration
- [ ] **RALPH-05**: Completion detection checks for success criteria before stopping
- [ ] **RALPH-06**: Behavioral verification validates actual functionality, not just structure

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
| BROW-01 | Phase 1 | Pending |
| BROW-02 | Phase 1 | Pending |
| BROW-03 | Phase 1 | Pending |
| BROW-04 | Phase 1 | Pending |
| BROW-05 | Phase 1 | Pending |
| BROW-06 | Phase 1 | Pending |
| AUTO-01 | Phase 2 | Pending |
| AUTO-02 | Phase 2 | Pending |
| AUTO-03 | Phase 2 | Pending |
| AUTO-04 | Phase 2 | Pending |
| AUTO-05 | Phase 2 | Pending |
| AUTO-06 | Phase 2 | Pending |
| AUTO-07 | Phase 2 | Pending |
| BIDR-01 | Phase 3 | Pending |
| BIDR-02 | Phase 3 | Pending |
| BIDR-03 | Phase 3 | Pending |
| BIDR-04 | Phase 3 | Pending |
| BIDR-05 | Phase 3 | Pending |
| BIDR-06 | Phase 3 | Pending |
| BIDR-07 | Phase 3 | Pending |
| KNOW-01 | Phase 3 | Pending |
| KNOW-02 | Phase 3 | Pending |
| KNOW-03 | Phase 3 | Pending |
| KNOW-04 | Phase 3 | Pending |
| MCP-01 | Phase 4 | Pending |
| MCP-02 | Phase 4 | Pending |
| MCP-03 | Phase 4 | Pending |
| MCP-04 | Phase 4 | Pending |
| MCP-05 | Phase 4 | Pending |
| MCP-06 | Phase 4 | Pending |
| MCP-07 | Phase 4 | Pending |
| MCP-08 | Phase 4 | Pending |
| MCP-09 | Phase 4 | Pending |
| MCP-10 | Phase 4 | Pending |
| GSD-01 | Phase 5 | Pending |
| GSD-02 | Phase 5 | Pending |
| GSD-03 | Phase 5 | Pending |
| GSD-04 | Phase 5 | Pending |
| RALPH-01 | Phase 5 | Pending |
| RALPH-02 | Phase 5 | Pending |
| RALPH-03 | Phase 5 | Pending |
| RALPH-04 | Phase 5 | Pending |
| RALPH-05 | Phase 5 | Pending |
| RALPH-06 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 43 total
- Mapped to phases: 43 (Phases 1-5)
- Unmapped: 0
- Phase 6: Integration phase (validates all requirements, introduces no new ones)

---
*Requirements defined: 2026-02-02*
*Last updated: 2026-02-02 after roadmap creation*
