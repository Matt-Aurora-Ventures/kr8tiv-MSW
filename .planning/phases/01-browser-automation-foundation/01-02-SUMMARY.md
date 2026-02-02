# Plan 01-02 Summary: Chrome Profile Persistence with Locking

## Status: COMPLETE

## What Was Built

**`src/browser/profile.ts`** — `ProfileManager` class that manages a dedicated Chrome profile directory with single-instance locking.

### ProfileManager API

| Method | Purpose |
|--------|---------|
| `constructor(profileDir?)` | Defaults to `~/.msw/chrome-profile/` |
| `ensureProfileDir()` | Creates directory recursively, returns path |
| `acquireLock()` | PID-based lock file; detects stale locks from crashed processes |
| `releaseLock()` | Removes lock if owned by current process |
| `isLocked()` | Checks if another live process holds the lock |
| `getProfileDir()` | Convenience: ensures dir + acquires lock + returns path |

### Key Behaviors

- Profile directory is always under `~/.msw/chrome-profile/`, never the user's real Chrome profile
- Lock file (`.lock`) contains the owning process PID
- Stale locks from crashed processes are automatically cleaned up
- Lock is released on process exit and SIGINT
- Throws descriptive error if another MSW instance is active

## Scaffold

Created minimal `package.json` and `tsconfig.json` since plan 01-01 (parallel) had not yet run. These may be superseded by 01-01's scaffold.

## Verification

- `npx tsc --noEmit` passes with zero errors
