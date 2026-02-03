# MSW Protocol

## What This Is

MSW (Make Shit Work) Protocol is an autonomous coding system that creates a bidirectional conversation bridge between NotebookLM and coding agents (Claude Code, Windsurf, Cursor). It eliminates the manual copy-paste workflow by automatically querying NotebookLM when errors occur, expanding suggested topics to build a comprehensive research foundation, and injecting grounded answers back into the agent's context.

## Core Value

Zero manual copy-paste between NotebookLM and coding agents — when an agent hits an error, MSW automatically queries NotebookLM and injects the grounded solution back, breaking the endless loop of hallucinated API fixes.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Core Features:**
- [ ] Auto-Conversation Engine that detects and clicks all relevant suggested topics in NotebookLM
- [ ] Relevance scoring (0-100) for each topic using local LLM evaluation
- [ ] Multi-level topic expansion (up to 10 levels deep) until no new relevant topics appear
- [ ] Bidirectional query injection: agent errors → NotebookLM → grounded answers → back to agent
- [ ] Report compilation and git commit of all Q&A pairs to `.msw/research/`
- [ ] MCP server exposing `msw_init`, `msw_research`, `msw_plan`, `msw_execute`, `msw_verify`, `msw_status` tools
- [ ] GSD Protocol integration for spec-driven planning with research grounding
- [ ] Ralph Wiggum Loop integration for continuous execution with NotebookLM feedback on failures
- [ ] Layered browser strategy: easiest implementation first, API fallback, full Playwright control
- [ ] Query batching to optimize NotebookLM's 50 queries/day limit

**Production Hardening:**
- [ ] Comprehensive test suite (unit, integration, E2E) with Vitest
- [ ] CI/CD pipeline via GitHub Actions with multi-Node validation
- [ ] Enhanced error logging with structured logs to `.msw/logs/`
- [ ] Rate limiting handler to prevent API exhaustion
- [ ] Interactive demo mode for new user onboarding
- [ ] Session management dashboard for tracking active operations
- [ ] Offline mode with query caching for degraded connectivity
- [ ] Performance metrics tracking (timing, cache hit rates)
- [ ] Self-healing diagnostics that auto-fix common issues
- [ ] Multi-notebook support for switching between knowledge bases

### Out of Scope (v1.0)

- Web UI for notebook management — CLI/MCP first
- Multi-notebook simultaneous routing — single notebook per session for v1
- Custom relevance models — use local LLM scoring initially
- Non-MCP integration (CLI-only mode) — MCP compatibility is primary constraint
- **Custom NotebookLM alternative — deferred to v2.0** (RAG system with vector DB as NotebookLM replacement)

### Future Milestones

**v2.0 Vision: Custom RAG Backend**
- Build MSW's own NotebookLM alternative using RAG architecture
- Remove dependency on Google's NotebookLM (eliminates bot detection, rate limits, UI brittleness)
- Components: Document parser, vector database (Pinecone/Weaviate/Chroma), embeddings (OpenAI/local), chat interface
- Maintain MCP compatibility with same tool interface
- Support both NotebookLM (v1.0) and custom RAG (v2.0) backends via configuration

## Context

**Origin:** Born from the frustration of manual copy-paste between NotebookLM and coding agents. The manual process worked incredibly well for fixing vibe coding errors — the goal is to automate the middleman.

**Existing Assets:**
- `msw-notebooklm-extractor.js` — existing NotebookLM extraction code (reference implementation)
- `notebooklm-mcp` — already running, provides browser automation foundation
- GSD Protocol installed and functional
- Ralph Wiggum Loop available for continuous execution

**Target Users:** Power users who already use Claude Code + NotebookLM and understand the value of grounded research but want to eliminate manual orchestration.

**Built On:**
- [GSD Protocol](https://github.com/glittercowboy/get-shit-done) — Spec-driven development
- [Ralph Wiggum Loop](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum) — Continuous iteration
- [NotebookLM MCP](https://github.com/PleasePrompto/notebooklm-mcp) — Agent-to-NotebookLM bridge

## Constraints

- **MCP Compatibility**: Must work with Claude Code, Windsurf, and Cursor as MCP clients
- **Rate Limits**: NotebookLM free tier limited to ~50 queries/day — solve via query batching, not multi-account
- **Browser Automation**: Must handle NotebookLM UI via Playwright with humanization features
- **Persistent Auth**: Chrome profile must persist for headless operation across sessions
- **Architecture**: Hybrid MCP — MSW wraps notebooklm-mcp, exposes unified interface

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Hybrid MCP architecture | Clean separation while unified interface, modular extensibility | — Pending |
| Layered browser strategy | Start easiest, add API and full browser as fallbacks | — Pending |
| Query batching over multi-account | Smarter questions beat burning accounts, simpler auth management | — Pending |
| Node.js runtime | Aligns with existing notebooklm-mcp, MCP SDK ecosystem | — Pending |
| Power users as v1 target | They understand the value, can tolerate rough edges | — Pending |

---
*Last updated: 2026-02-03 after adding production hardening scope*
