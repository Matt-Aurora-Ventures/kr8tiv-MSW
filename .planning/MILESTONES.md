# MSW Protocol Milestones

## Overview

MSW Protocol development is organized into milestones, each delivering a complete, production-ready capability set.

## Milestone History

### v1.0: NotebookLM Integration (In Progress)

**Status:** Planned (9 phases, 79 requirements)
**Started:** 2026-02-03
**Completed:** —

**Goal:** Autonomous bridge between NotebookLM and coding agents with zero manual copy-paste

**Phases:**
1. Browser Automation Foundation (6 plans)
2. Auto-Conversation Engine (6 plans)
3. Bidirectional Communication (6 plans)
4. MCP Server (8 plans)
5. GSD + Ralph Integration (8 plans)
6. End-to-End Integration (5 plans)
7. Automated Testing Suite (6 plans)
8. CI/CD Pipeline (5 plans)
9. Production Hardening (6 plans)

**Key deliverables:**
- Browser automation with stealth and persistent auth
- Automatic NotebookLM topic expansion and extraction
- Bidirectional error-to-solution bridge
- MCP server compatible with Claude Code, Windsurf, Cursor
- GSD planning and Ralph continuous execution
- Comprehensive test suite (80%+ coverage)
- CI/CD pipeline with GitHub Actions
- Production-grade logging, diagnostics, session management

**Requirements:** 79 total
- Browser automation: 6
- Auto-conversation: 7
- Bidirectional + Knowledge: 11
- MCP server: 10
- GSD + Ralph: 10
- Testing: 12
- CI/CD: 10
- Hardening: 14

**Technology stack:**
- Node.js 24.x LTS
- TypeScript 5.5+
- MCP SDK 1.25.x
- Playwright 1.58+
- Vitest 3.x
- Pino 9.x

---

## Future Milestones

### v2.0: Custom RAG Backend (Planned)

**Status:** Not started
**Dependencies:** v1.0 complete
**Goal:** Replace NotebookLM with MSW's own RAG system

**Vision:**
Build a custom knowledge base backend that eliminates dependency on Google's NotebookLM. This removes:
- Bot detection risks (no browser automation needed)
- Rate limits (50 queries/day → unlimited local queries)
- UI brittleness (no selector fragility)
- Authentication complexity (no Google account required)

**Proposed architecture:**
- **Document ingestion:** Parse .md, .txt, .pdf, .docx, URLs
- **Embeddings:** OpenAI text-embedding-3 or local models (BGE, E5)
- **Vector database:** Pinecone, Weaviate, or Chroma
- **Retrieval:** Semantic search with reranking
- **Generation:** OpenAI GPT-4 or Anthropic Claude with RAG context
- **Interface:** Same MCP tools, swappable backend via config

**Benefits:**
- No rate limits or browser automation
- Faster queries (local vector search vs UI automation)
- Full control over retrieval and ranking
- Can run offline with local models
- Easier testing and development

**Compatibility:**
- Maintain NotebookLM backend for users who prefer it
- Configuration option: `backend: "notebooklm" | "rag"`
- Same MCP tool interface (no breaking changes)

**Estimated scope:** 8-10 phases
- Document parsing and chunking
- Vector database integration
- Embeddings pipeline
- Retrieval and reranking
- LLM integration with RAG context
- Query optimization
- Caching and performance
- Migration tooling (NotebookLM → RAG)

**Research needed:**
- Vector database selection (cost, performance, hosting)
- Embeddings model (quality vs speed vs cost)
- Chunking strategy for optimal retrieval
- RAG prompt engineering for coding context

---

### v3.0: Advanced Features (Future)

Potential future directions (not yet scoped):
- Multi-agent collaboration (multiple MSW instances coordinating)
- Voice interface (speak questions, hear answers)
- IDE extensions (VS Code, JetBrains native integration)
- Team knowledge bases (shared notebooks/RAG databases)
- Analytics dashboard (query patterns, success rates)

---

*Last updated: 2026-02-03*
*Current milestone: v1.0 (Phase 1 pending)*
