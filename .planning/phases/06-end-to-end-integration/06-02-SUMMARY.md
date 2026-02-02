# 06-02 Summary: Config Validation, Health Checks, Crash Recovery

## Status: COMPLETE

## Files Created

| File | Purpose | Exports |
|------|---------|---------|
| `src/config/schema.ts` | Zod schema for .msw/config.json | `MswConfigSchema`, `MswConfig` |
| `src/config/validator.ts` | Config loading and validation | `loadConfig`, `validateConfig` |
| `src/pipeline/health.ts` | Subsystem health checks | `checkHealth` |
| `src/pipeline/state.ts` | Pipeline state persistence | `saveCheckpoint`, `restoreCheckpoint`, `clearCheckpoint` |

## What Was Built

### Config Validation
- Zod schema validates `notebookUrl` (must be URL), `relevanceThreshold` (0-100, default 30), `maxDepth` (1-10, default 5), `maxQueriesPerDay` (default 50), optional `profileDir` and `version`
- `validateConfig()` returns structured success/error result
- `loadConfig()` reads .msw/config.json with clear error messages on failure

### Health Checks
- Browser: verifies playwright is importable
- Ollama: fetches localhost:11434/api/tags with 2s timeout
- Git: checks `git --version` availability
- Each returns healthy/unhealthy with degraded capability message

### Crash Recovery
- `saveCheckpoint()` writes state atomically (write .tmp then rename)
- `restoreCheckpoint()` returns PipelineState or null
- `clearCheckpoint()` removes state file after success
- PipelineState tracks sessionId, phase, pendingQueries, completedQA, lastCheckpoint

## Verification
- `npx tsc --noEmit` passes with zero errors
