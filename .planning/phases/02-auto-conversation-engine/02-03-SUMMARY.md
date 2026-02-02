---
phase: 02-auto-conversation-engine
plan: 03
status: complete
---

# 02-03 Summary: Budget Tracker & Topic Clicker

## What Was Built

### BudgetTracker (`src/auto-conversation/budget-tracker.ts`)
- Tracks daily query count against a configurable limit (default 50)
- Persists state to `.msw/budget.json` (configurable path)
- Auto-resets count when the date changes (new day)
- Warns at 80% usage threshold
- Methods: `canQuery()`, `remaining()`, `consume()`, `isNearLimit()`, `getWarning()`
- Uses `node:fs` directly -- no external dependencies

### TopicClicker (`src/auto-conversation/topic-clicker.ts`)
- Clicks a topic pill button by visible text
- Uses `humanClick` from Phase 1 for realistic click behaviour
- Waits for streaming completion via `waitForStreamingComplete`
- Extracts response via Phase 1's `ResponseExtractor`
- Descriptive error types: `TopicNotFound` and `StreamingTimeout`
- Fallback locator strategy: `getByRole` then `filter({ hasText })`

## Verification
- `npx tsc --noEmit` passes with zero errors
- Both files export their classes correctly
- All Phase 1 imports resolve (humanize, wait, extractor)

## Dependencies Satisfied
- 02-01 (TopicDetector + types) -- uses `BudgetState` from types.ts
- Phase 1 browser utils -- imports humanClick, waitForStreamingComplete
- Phase 1 extractor -- imports ResponseExtractor
