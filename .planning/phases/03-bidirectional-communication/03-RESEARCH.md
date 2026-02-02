# Phase 3: Bidirectional Communication + Knowledge Persistence - Research

**Researched:** 2026-02-02
**Domain:** Query injection, error bridging, response parsing, git persistence, deduplication, context injection
**Confidence:** HIGH

## Summary

Phase 3 transforms the one-way auto-expansion engine (Phase 2) into a two-way bridge: coding agent errors flow into NotebookLM as structured queries, and grounded answers flow back with source citations. All Q&A pairs are persisted as structured markdown committed to `.msw/research/`. The phase has two distinct sub-domains: (1) the bidirectional communication pipeline (BIDR-01 through BIDR-07) handling query injection, error formatting, response extraction, deduplication, and context injection; and (2) the knowledge persistence layer (KNOW-01 through KNOW-04) handling report compilation, git commits, metadata, and decision traceability.

The technical approach is straightforward: query injection reuses Phase 1's `Selectors.chatInput` and `Selectors.sendButton` with Phase 1's humanized typing. Error templates are structured TypeScript objects that format agent errors with file, line, stack trace, and what-was-tried context. Query deduplication uses normalized string hashing (SHA-256 of lowercased, trimmed, punctuation-stripped text) plus a Dice coefficient similarity check for near-duplicates. Git operations use the `simple-git` npm package. Response parsing extends Phase 1's `ResponseExtractor` to extract source citations (NotebookLM attributes answers to uploaded sources).

**Primary recommendation:** Use `simple-git` for all git operations. Structure error templates as TypeScript interfaces with required context fields. Implement two-tier deduplication: exact (SHA-256 hash) + fuzzy (Dice coefficient > 0.85). Persist Q&A as individual markdown files in `.msw/research/sessions/<timestamp>/` and compile a session summary on completion.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| [simple-git](https://www.npmjs.com/package/simple-git) | 3.x | Git add/commit from Node.js | 6500+ dependents, wraps git CLI, async/await, TypeScript types |
| [string-similarity](https://www.npmjs.com/package/string-similarity) | 4.x | Dice coefficient for fuzzy deduplication | Lightweight, well-tested, Dice's Coefficient outperforms Levenshtein for sentence-level comparison |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `crypto` (built-in) | N/A | SHA-256 hashing for exact dedup | Always, for the first dedup tier |
| [gray-matter](https://www.npmjs.com/package/gray-matter) | 4.x | Parse/generate YAML frontmatter in markdown | When reading/writing research markdown files with metadata |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| simple-git | child_process.exec('git ...') | simple-git handles escaping, errors, async properly; raw exec is fragile |
| simple-git | isomorphic-git | isomorphic-git is pure JS (no git binary), but much heavier and slower for basic operations |
| string-similarity (Dice) | fuzzball (Levenshtein) | Dice is better for sentence-level; Levenshtein is char-level |
| gray-matter | Manual YAML serialization | gray-matter handles edge cases in frontmatter parsing |

**Installation:**
```bash
npm install simple-git string-similarity gray-matter
npm install -D @types/string-similarity
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── bidirectional/
│   ├── query-injector.ts      # BIDR-01: Types queries into NotebookLM
│   ├── error-bridge.ts        # BIDR-02: Formats agent errors for NotebookLM
│   ├── response-parser.ts     # BIDR-03: Extends ResponseExtractor with citations
│   ├── answer-chain.ts        # BIDR-04: Aggregates multi-turn conversations
│   ├── deduplication.ts       # BIDR-05: Prevents repeat questions
│   ├── error-templates.ts     # BIDR-06: Rich error context structures
│   └── context-injector.ts    # BIDR-07: Passes answers back to agent
├── knowledge/
│   ├── report-compiler.ts     # KNOW-01: Q&A pairs -> markdown
│   ├── git-manager.ts         # KNOW-02: Git commit to .msw/research/
│   ├── metadata.ts            # KNOW-03: Source, timestamp, relevance tracking
│   └── traceability.ts        # KNOW-04: Links code changes to research
└── types/
    └── bidirectional.ts       # Shared types for this phase
```

### Pattern 1: Query Injection Pipeline
**What:** Take a question string, type it into NotebookLM's chat input with humanized delays, submit, wait for streaming completion, extract response.
**When to use:** Every time the agent or error bridge needs to ask NotebookLM a question.
**Example:**
```typescript
// Source: Phase 1 Selectors + humanize patterns
import { Selectors } from '../browser/selectors.js';
import { humanType, humanClick } from '../browser/humanize.js';
import { waitForStreamingComplete } from '../browser/wait.js';
import { ResponseExtractor } from '../notebooklm/extractor.js';

export class QueryInjector {
  private page: Page;
  private extractor: ResponseExtractor;

  constructor(page: Page) {
    this.page = page;
    this.extractor = new ResponseExtractor(page);
  }

  async inject(query: string): Promise<{ question: string; answer: string }> {
    const input = Selectors.chatInput(this.page);
    const send = Selectors.sendButton(this.page);

    // Clear any existing text
    await input.click();
    await input.fill('');

    // Type with humanized delays
    await humanType(input, query);
    await humanClick(send);

    // Wait for response streaming to complete
    await waitForStreamingComplete(
      this.page,
      '[data-message-author="assistant"]:last-of-type',
    );

    const answer = await this.extractor.extractLatestResponse();
    return { question: query, answer };
  }
}
```

### Pattern 2: Error Template System
**What:** Structured error objects that provide rich context for NotebookLM queries. The template formats an agent error with surrounding code context, stack trace, and what has been tried, then generates a natural-language question.
**When to use:** When the error bridge captures a coding agent error.
**Example:**
```typescript
// Source: Custom design for BIDR-02, BIDR-06
export interface AgentError {
  message: string;
  file?: string;
  line?: number;
  stackTrace?: string;
  codeSnippet?: string;       // surrounding 5-10 lines
  attemptedFixes?: string[];  // what the agent already tried
  technology?: string;        // e.g., "React", "Playwright"
}

export function formatErrorQuery(error: AgentError, taskGoal: string): string {
  const parts: string[] = [
    `I'm working on: ${taskGoal}`,
    ``,
    `I'm getting this error: ${error.message}`,
  ];

  if (error.file) {
    parts.push(`In file: ${error.file}${error.line ? `:${error.line}` : ''}`);
  }

  if (error.codeSnippet) {
    parts.push(``, `Relevant code:`, error.codeSnippet);
  }

  if (error.attemptedFixes?.length) {
    parts.push(``, `I already tried:`, ...error.attemptedFixes.map(f => `- ${f}`));
  }

  parts.push(``, `What's the correct approach based on the documentation?`);
  return parts.join('\n');
}
```

### Pattern 3: Two-Tier Query Deduplication
**What:** Exact hash check (fast, O(1)) followed by fuzzy similarity check against all previous queries. Prevents both exact repeats and rephrased duplicates.
**When to use:** Before every query injection.
**Example:**
```typescript
// Source: Node.js crypto + string-similarity
import { createHash } from 'node:crypto';
import { compareTwoStrings } from 'string-similarity';

export class QueryDeduplicator {
  private exactHashes = new Set<string>();
  private previousQueries: string[] = [];
  private similarityThreshold = 0.85;

  private normalize(query: string): string {
    return query.trim().toLowerCase().replace(/[?.!,;:]+$/g, '').replace(/\s+/g, ' ');
  }

  private hash(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  isDuplicate(query: string): { duplicate: boolean; matchedQuery?: string } {
    const normalized = this.normalize(query);
    const queryHash = this.hash(normalized);

    // Tier 1: Exact match
    if (this.exactHashes.has(queryHash)) {
      return { duplicate: true, matchedQuery: normalized };
    }

    // Tier 2: Fuzzy match
    for (const prev of this.previousQueries) {
      const similarity = compareTwoStrings(normalized, prev);
      if (similarity >= this.similarityThreshold) {
        return { duplicate: true, matchedQuery: prev };
      }
    }

    return { duplicate: false };
  }

  record(query: string): void {
    const normalized = this.normalize(query);
    this.exactHashes.add(this.hash(normalized));
    this.previousQueries.push(normalized);
  }
}
```

### Pattern 4: Git Manager with simple-git
**What:** Commit Q&A research artifacts to `.msw/research/` with structured commit messages and metadata.
**When to use:** After compiling a research report or at session end.
**Example:**
```typescript
// Source: https://www.npmjs.com/package/simple-git
import simpleGit, { SimpleGit } from 'simple-git';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export class GitManager {
  private git: SimpleGit;
  private researchDir: string;

  constructor(projectRoot: string) {
    this.git = simpleGit(projectRoot);
    this.researchDir = join(projectRoot, '.msw', 'research');
  }

  async ensureResearchDir(): Promise<void> {
    if (!existsSync(this.researchDir)) {
      mkdirSync(this.researchDir, { recursive: true });
    }
  }

  async commitResearch(files: string[], sessionId: string): Promise<string> {
    await this.git.add(files);
    const result = await this.git.commit(
      `research(msw): ${sessionId}\n\nAuto-committed by MSW Protocol`,
      files,
    );
    return result.commit;
  }

  async isGitRepo(): Promise<boolean> {
    try {
      await this.git.revparse(['--is-inside-work-tree']);
      return true;
    } catch {
      return false;
    }
  }
}
```

### Pattern 5: Report Compiler with Frontmatter
**What:** Convert Q&A pairs into structured markdown with YAML frontmatter metadata. Each session produces one file with all Q&A pairs organized by topic.
**When to use:** After a session's queries are complete, or on periodic flush.
**Example:**
```typescript
// Source: Custom design for KNOW-01, KNOW-03
import matter from 'gray-matter';

export interface QAPair {
  question: string;
  answer: string;
  timestamp: Date;
  source: 'auto-expansion' | 'error-bridge' | 'manual';
  relevanceScore?: number;
  citations?: string[];
}

export interface ResearchReport {
  sessionId: string;
  notebook: string;
  taskGoal: string;
  pairs: QAPair[];
  startTime: Date;
  endTime: Date;
}

export function compileReport(report: ResearchReport): string {
  const frontmatter = {
    sessionId: report.sessionId,
    notebook: report.notebook,
    taskGoal: report.taskGoal,
    queryCount: report.pairs.length,
    startTime: report.startTime.toISOString(),
    endTime: report.endTime.toISOString(),
    sources: [...new Set(report.pairs.map(p => p.source))],
  };

  const body = report.pairs.map((pair, i) => {
    const meta = [
      `*Source: ${pair.source}*`,
      pair.relevanceScore != null ? `*Relevance: ${pair.relevanceScore}/100*` : '',
      `*Time: ${pair.timestamp.toISOString()}*`,
    ].filter(Boolean).join(' | ');

    const citations = pair.citations?.length
      ? `\n\n**Citations:** ${pair.citations.join(', ')}`
      : '';

    return `## Q${i + 1}: ${pair.question}\n\n${meta}\n\n${pair.answer}${citations}`;
  }).join('\n\n---\n\n');

  return matter.stringify(body, frontmatter);
}
```

### Pattern 6: Context Injection Back to Agent
**What:** Format NotebookLM answers for injection into the coding agent's context. The output should be a self-contained markdown block that the agent can read.
**When to use:** After extracting a response to an error query (BIDR-07).
**Example:**
```typescript
// Source: Custom design for BIDR-07
export interface AgentContext {
  query: string;
  answer: string;
  citations: string[];
  confidence: 'high' | 'medium' | 'low';
}

export function formatForAgent(ctx: AgentContext): string {
  return [
    `## NotebookLM Research Finding`,
    ``,
    `**Query:** ${ctx.query}`,
    `**Confidence:** ${ctx.confidence} (grounded in uploaded documentation)`,
    ctx.citations.length ? `**Sources:** ${ctx.citations.join(', ')}` : '',
    ``,
    ctx.answer,
    ``,
    `---`,
    `*Retrieved via MSW Protocol from NotebookLM*`,
  ].filter(Boolean).join('\n');
}
```

### Anti-Patterns to Avoid
- **Raw child_process for git:** Fragile escaping, no error types, no async/await. Use `simple-git`.
- **Storing DOM references across navigations:** After query injection triggers a new response, old locators may be stale. Always re-query selectors.
- **Unbounded error query retries:** If NotebookLM can't answer an error, don't retry the same query. Mark it as unresolved and move on.
- **Monolithic session files:** Don't dump everything into one giant markdown. Use one file per session with clear sections.
- **Skipping git status checks:** Before committing, verify the project is a git repo and `.msw/` isn't gitignored.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Git operations | child_process git commands | `simple-git` | Proper escaping, error handling, TypeScript types |
| String similarity | Custom Levenshtein implementation | `string-similarity` (Dice coefficient) | Battle-tested, fast, better for sentences than char-level edit distance |
| SHA-256 hashing | External crypto library | Node.js built-in `crypto` | Zero dependencies, performant, already available |
| YAML frontmatter | Manual string concatenation | `gray-matter` | Handles edge cases, bidirectional parse/stringify |
| Markdown escaping | Regex-based escaping | Template literal approach with sections | Simple enough that a library is overkill, but don't regex-escape markdown content |

**Key insight:** This phase is mostly integration -- connecting Phase 1/2 components into a pipeline and adding persistence. The new code is glue (error templates, report compilation, git commits), not complex algorithms. Keep it simple.

## Common Pitfalls

### Pitfall 1: NotebookLM Chat Input Character Limits
**What goes wrong:** Long error messages with full stack traces get truncated or rejected by NotebookLM's chat input.
**Why it happens:** NotebookLM may have a character limit on chat input (exact limit unknown, estimated 2000-4000 chars).
**How to avoid:** Truncate error templates to a max length (default 2000 chars). Prioritize: error message > code snippet > attempted fixes > stack trace. The template system should have a `maxLength` config.
**Warning signs:** Queries are silently truncated; answers don't address the full error context.

### Pitfall 2: Citation Parsing Fragility
**What goes wrong:** Source citations in NotebookLM responses have no stable format. Parsing breaks when NotebookLM changes how it attributes sources.
**Why it happens:** NotebookLM renders inline citations as superscript numbers or bracketed references, but the HTML structure may change.
**How to avoid:** Implement citation parsing as a best-effort operation. Extract what you can (numbered references, source names), but never fail if citations can't be parsed. Store the raw response text as fallback.
**Warning signs:** `citations` array is always empty despite NotebookLM clearly attributing sources.

### Pitfall 3: Git Commit in Non-Git Projects
**What goes wrong:** `simple-git` throws when the project directory isn't a git repository.
**Why it happens:** User runs MSW in a directory without `git init`.
**How to avoid:** Check `isGitRepo()` before any git operations. If not a repo, warn and skip git persistence (still write files, just don't commit). Optionally offer to `git init`.
**Warning signs:** `fatal: not a git repository` error.

### Pitfall 4: Race Between Query Injection and Auto-Expansion
**What goes wrong:** Phase 2's auto-expansion engine and Phase 3's error bridge both try to interact with NotebookLM's chat simultaneously.
**Why it happens:** Both share the same browser page and chat input.
**How to avoid:** Use a single async queue (from Phase 2's `p-queue` with concurrency 1) for ALL NotebookLM interactions. Error bridge queries go into the same queue as auto-expansion. Priority: error queries > manual queries > auto-expansion.
**Warning signs:** Interleaved typing in chat input, garbled queries.

### Pitfall 5: Budget Split Between Auto-Expansion and Error Queries
**What goes wrong:** Auto-expansion consumes all 50 daily queries, leaving none for error-driven research during coding.
**Why it happens:** Phase 2's budget tracker doesn't reserve queries for Phase 3.
**How to avoid:** Phase 2 research already recommended reserving 15 queries for bidirectional use. Implement a `BudgetAllocator` that partitions the daily budget: `{ autoExpansion: 35, errorBridge: 10, manual: 5 }`. Error bridge queries should be able to borrow from auto-expansion allocation if needed.
**Warning signs:** "No budget remaining" when agent hits its first error.

### Pitfall 6: Answer Chain Grows Unbounded
**What goes wrong:** Multi-turn conversations produce answer chains that exceed context window limits when injected back to the agent.
**Why it happens:** Each NotebookLM response can be 500-2000 chars. 10 follow-up turns = 5000-20000 chars of context.
**How to avoid:** Implement answer chain summarization. After N turns (configurable, default 5), summarize the chain to key findings before injecting to agent. Include the summary + most recent response, not the full chain.
**Warning signs:** Agent context window errors, or agent ignores injected research because it's too long.

## Code Examples

### Complete Error-to-Resolution Pipeline
```typescript
// Source: Custom design combining all BIDR requirements
async function handleAgentError(
  error: AgentError,
  taskGoal: string,
  injector: QueryInjector,
  dedup: QueryDeduplicator,
  chain: AnswerChain,
): Promise<AgentContext | null> {
  // Format the error as a query
  const query = formatErrorQuery(error, taskGoal);

  // Check deduplication
  const { duplicate, matchedQuery } = dedup.isDuplicate(query);
  if (duplicate) {
    console.log(`Skipping duplicate query (matched: "${matchedQuery?.slice(0, 50)}...")`);
    return chain.getExistingAnswer(matchedQuery!);
  }

  // Inject query into NotebookLM
  const { answer } = await injector.inject(query);
  dedup.record(query);

  // Parse citations from response
  const citations = parseCitations(answer);

  // Add to answer chain
  chain.add({ question: query, answer, citations, timestamp: new Date() });

  // Format for agent consumption
  return formatForAgent({
    query,
    answer,
    citations,
    confidence: citations.length > 0 ? 'high' : 'medium',
  });
}
```

### Session Lifecycle with Git Persistence
```typescript
// Source: Custom design for KNOW-01 through KNOW-04
async function runResearchSession(config: SessionConfig): Promise<void> {
  const git = new GitManager(config.projectRoot);
  const compiler = new ReportCompiler();
  const sessionId = `session-${Date.now()}`;

  // ... run queries, collect Q&A pairs ...

  // Compile report
  const report = compiler.compile({
    sessionId,
    notebook: config.notebookUrl,
    taskGoal: config.taskGoal,
    pairs: collectedPairs,
    startTime, endTime: new Date(),
  });

  // Write to .msw/research/
  const filePath = join(config.projectRoot, '.msw', 'research', `${sessionId}.md`);
  await git.ensureResearchDir();
  writeFileSync(filePath, report);

  // Commit if in git repo
  if (await git.isGitRepo()) {
    await git.commitResearch([filePath], sessionId);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual copy-paste errors to NotebookLM | Automated error bridge with templates | New (MSW Phase 3) | Eliminates human middleman |
| nodegit (native bindings) | simple-git (wraps git CLI) | 2023+ | nodegit has maintenance issues; simple-git is actively maintained |
| Manual knowledge management | Git-committed research with metadata | New (MSW Phase 3) | Persistent, searchable, version-controlled research |

**Deprecated/outdated:**
- `nodegit`: Native bindings, complex build requirements, infrequent updates. Use `simple-git` instead.
- Manual YAML construction: Use `gray-matter` for reliable frontmatter handling.

## Open Questions

1. **NotebookLM Chat Input Character Limit**
   - What we know: There is likely a limit, but the exact number is undocumented.
   - What's unclear: Whether it's enforced client-side (truncation) or server-side (rejection).
   - Recommendation: Test empirically during implementation. Default error template max to 2000 chars. Make configurable.

2. **Citation Format Stability**
   - What we know: NotebookLM uses inline citations referencing uploaded sources.
   - What's unclear: Exact HTML structure of citations. May be superscript numbers, bracketed text, or tooltip-based.
   - Recommendation: Implement citation parsing as best-effort with fallback to raw text. This needs live testing against actual NotebookLM responses.

3. **Context Injection Mechanism**
   - What we know: BIDR-07 says "pass answers back to coding agent."
   - What's unclear: The exact mechanism depends on Phase 4 (MCP server). For Phase 3, the output is a formatted string. The MCP tool response in Phase 4 will deliver it.
   - Recommendation: Phase 3 builds the formatting and compilation. Phase 4 builds the delivery mechanism. For now, write formatted context to a well-known file path (`.msw/context/latest.md`) that agents can read.

4. **Decision Traceability Granularity (KNOW-04)**
   - What we know: Requirement says "link code changes to research findings."
   - What's unclear: At what granularity? File-level? Function-level? Line-level?
   - Recommendation: Start with session-level: each git commit from MSW includes a reference to the research session ID in the commit message. Finer granularity can be added in Phase 6.

## Sources

### Primary (HIGH confidence)
- [simple-git npm](https://www.npmjs.com/package/simple-git) - API, TypeScript support, async patterns
- [simple-git GitHub](https://github.com/steveukx/git-js) - Examples, TypeScript types
- Phase 1 Research (`01-RESEARCH.md`) - Playwright patterns, selectors, humanization, streaming detection
- Phase 2 Research (`02-RESEARCH.md`) - Budget tracker, topic expansion, relevance scoring
- Phase 1 codebase (`src/browser/`, `src/notebooklm/`) - Existing Selectors, ResponseExtractor, humanize, wait

### Secondary (MEDIUM confidence)
- [string-similarity npm](https://www.npmjs.com/package/string-similarity) - Dice coefficient API
- [gray-matter npm](https://www.npmjs.com/package/gray-matter) - Frontmatter parse/stringify

### Tertiary (LOW confidence)
- NotebookLM citation format - based on observation, not documented API. Needs live validation.
- Chat input character limit - estimated from general web UI patterns. Needs empirical testing.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - simple-git is the de facto Node.js git library; string-similarity is well-established
- Architecture: HIGH - Pipeline pattern is straightforward integration of Phase 1/2 components
- Error templates: HIGH - Standard structured error representation; no novel complexity
- Deduplication: HIGH - SHA-256 + Dice coefficient is a proven two-tier approach
- Git persistence: HIGH - simple-git API is well-documented with TypeScript types
- Citation parsing: LOW - NotebookLM's citation HTML structure is undocumented; needs live testing
- Context injection delivery: MEDIUM - Format is clear, but delivery mechanism depends on Phase 4

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - simple-git API is stable; NotebookLM UI may change)
