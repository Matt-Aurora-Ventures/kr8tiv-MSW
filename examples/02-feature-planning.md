# Example 2: Feature Planning with MSW + GSD

**Scenario**: Plan a new feature using NotebookLM research + GSD Protocol for spec-driven development.

**Time**: ~20 minutes
**Difficulty**: Intermediate

---

## Setup

**NotebookLM Notebook**: Contains:
- Project architecture docs
- API documentation
- Best practices guides
- Past implementation patterns

**Goal**: Generate a PRD grounded in existing knowledge, then implement it systematically.

---

## Workflow

### Step 1: Research Phase

**Task**: "I need to add real-time notifications to my app"

First, research existing patterns:

```
Run research on notification systems in the codebase
```

**What MSW does**:
1. Queries NotebookLM: "What notification patterns exist?"
2. Auto-clicks suggested topics:
   - "WebSocket implementation"
   - "Push notification setup"
   - "Real-time event handling"
3. Compiles findings to `.msw/research/notifications-2026-02-03.md`

**Research output**:
```markdown
# Notification Systems Research

## Current Implementation
- REST polling (inefficient)
- No real-time support
- Client polls every 30s

## Suggested Approaches
1. WebSockets (bidirectional, real-time)
2. Server-Sent Events (one-way, simpler)
3. Firebase Cloud Messaging (mobile-first)

## Existing Infrastructure
- Express server (can add ws:// support)
- Redis available for pub/sub
- Authentication via JWT

Source: Architecture Docs, Section 4
```

---

### Step 2: Generate PRD

```
Create a PRD for real-time notifications based on research
```

**What MSW does**:
1. Reads research findings from Step 1
2. Applies GSD template format
3. Generates `.msw/PRD-notifications.md`

**PRD output**:
```markdown
# PRD: Real-Time Notifications

## Problem
Current polling system is inefficient (30s delay, wasteful)

## Solution
WebSocket-based real-time notifications using Socket.io

## Requirements
1. Server broadcasts events via WebSocket
2. Client connects on page load
3. Authentication via JWT token
4. Fallback to polling if WebSocket fails
5. Redis pub/sub for horizontal scaling

## Success Criteria
- Notification latency < 1 second
- No polling overhead
- Works across browser tabs
- Scales to 10k concurrent users

## Out of Scope
- Mobile push notifications (Phase 2)
- Desktop notifications
- Custom sounds/badges
```

---

### Step 3: Execute with Ralph Loop

```
Execute the notification PRD using Ralph loop
```

**What MSW does**:
1. Reads PRD requirements
2. Starts Ralph iteration loop
3. On errors → queries NotebookLM for solutions
4. Injects solutions back into agent context
5. Continues until requirements met

**Ralph Loop Example**:

```
Iteration 1: Install Socket.io
→ Error: Package conflict with Express

Query NotebookLM: "Socket.io compatibility with Express"
→ Answer: "Use socket.io@4.x with express@4.x"

Iteration 2: Fixed, install Socket.io@4.6
→ Success, move to next requirement

Iteration 3: Implement server broadcast
→ Success

Iteration 4: Add client connection
→ Error: CORS policy blocking WebSocket

Query NotebookLM: "Socket.io CORS configuration"
→ Answer: "Add cors option in io() constructor"

Iteration 5: Fixed CORS
→ Success

... continues until complete
```

---

### Step 4: Verify Implementation

```
Verify notification system against PRD requirements
```

**What MSW does**:
1. Reads PRD requirements list
2. Runs verification commands
3. Queries NotebookLM if verification fails
4. Reports what's working vs. missing

**Verification output**:
```json
{
  "requirements": [
    {
      "id": "REQ-1",
      "description": "Server broadcasts via WebSocket",
      "status": "pass",
      "verification": "✓ io.emit() functional"
    },
    {
      "id": "REQ-2",
      "description": "Client connects on page load",
      "status": "pass",
      "verification": "✓ socket.on('connect') fires"
    },
    {
      "id": "REQ-3",
      "description": "JWT authentication",
      "status": "warn",
      "verification": "⚠ Auth works but token refresh missing"
    }
  ]
}
```

---

### Step 5: Document & Commit

```
Commit the notification system implementation
```

Auto-generates commit message from PRD:
```
feat: add real-time WebSocket notifications

Implements PRD-notifications requirements:
- Server broadcasts via Socket.io
- Client auto-connects with JWT auth
- Redis pub/sub for scaling
- Fallback to polling

Closes #42

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

---

## MSW + GSD Integration

**Research → Plan → Execute → Verify** loop:

```
┌─────────────────────────────────────────────────────┐
│                   NotebookLM                        │
│              (Your Knowledge Base)                  │
└─────────────────────────────────────────────────────┘
         ↓                              ↑
    [Research]                     [Query on Error]
         ↓                              ↑
┌──────────────────┐            ┌──────────────────┐
│  MSW Protocol    │ ←──────→   │   Ralph Loop     │
│  (Orchestrator)  │            │  (Executor)      │
└──────────────────┘            └──────────────────┘
         ↓                              ↑
    [Generate PRD]                 [Inject Fixes]
         ↓                              ↑
┌─────────────────────────────────────────────────────┐
│              GSD Protocol                            │
│        (Spec-Driven Planning)                        │
└─────────────────────────────────────────────────────┘
```

**Key Benefits**:
1. **Grounded planning** - PRD based on your actual codebase docs
2. **Auto-recovery** - Errors trigger NotebookLM queries for solutions
3. **Continuous iteration** - Ralph loop doesn't stop until requirements met
4. **Traceability** - All research & decisions documented

---

## Tips

**Better Research**:
- Add comprehensive docs to NotebookLM first
- Use specific queries: "WebSocket auth with JWT" > "notifications"
- Let auto-conversation run to 10+ levels for deep knowledge

**Better PRDs**:
- Include success criteria (testable metrics)
- Define out-of-scope clearly
- Link to research findings

**Better Execution**:
- Set realistic `maxIterations` (5-10 for features)
- Define clear `completionPromise` string
- Provide verification commands upfront

---

## Common Pitfalls

❌ **Vague research queries** → Irrelevant answers
✅ **Specific queries with context** → Actionable answers

❌ **PRD without success criteria** → Ambiguous "done"
✅ **Measurable success criteria** → Clear completion signal

❌ **Ralph loop without max iterations** → Infinite loops
✅ **Set `maxIterations: 10`** → Fails gracefully

---

## Next Steps

- Try [Example 3: Code Review](./03-code-review.md) (coming soon)
- Read [GSD Protocol docs](https://github.com/glittercowboy/get-shit-done)
- Explore [Ralph Loop patterns](../docs/ralph-loop-and-mcp.md)
