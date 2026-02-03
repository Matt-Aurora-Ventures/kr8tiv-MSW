# Example 1: VPS Debugging with MSW

**Scenario**: Your VPS bot keeps crashing and you need to diagnose and fix it using NotebookLM as your knowledge base.

**Time**: ~10 minutes
**Difficulty**: Beginner

---

## Setup

**NotebookLM Notebook**: Contains:
- VPS server documentation
- Bot deployment guides
- Common error solutions
- Runbook procedures

**Goal**: Use MSW to query NotebookLM for solutions instead of manual copy-paste.

---

## Workflow

### Step 1: Initialize MSW

In your project directory:

```
Initialize MSW for this project
```

**What happens**:
- Creates `.msw/` directory
- Opens browser for Google authentication
- Saves auth profile for future use

**Expected output**:
```json
{
  "success": true,
  "authentication": {
    "authenticated": true,
    "profilePath": "/home/user/.msw/chrome_profile"
  }
}
```

---

### Step 2: Link NotebookLM Notebook

```
Link this NotebookLM notebook: https://notebooklm.google.com/notebook/abc123
```

**What happens**:
- Adds notebook URL to `.msw/config.json`
- Validates notebook is accessible

**Expected output**:
```json
{
  "success": true,
  "notebookUrl": "https://notebooklm.google.com/notebook/abc123",
  "notebooksLinked": 1
}
```

---

### Step 3: Run Research Query

When your bot crashes with error: `OAuth token expired`

```
Query NotebookLM: "How do I refresh OAuth tokens on the VPS?"
```

**What happens**:
- MSW opens NotebookLM
- Submits your question
- Extracts grounded answer with source citations
- Returns answer to Claude Code

**Expected output**:
```json
{
  "success": true,
  "answer": "To refresh OAuth tokens on VPS:
    1. Sync fresh tokens from Windows PC
    2. Copy to /root/.config/bots/tokens.json
    3. Restart container: docker restart clawdbot-friday

    Source: VPS Runbook, Section 3.2",
  "sources": ["VPS Runbook"]
}
```

---

### Step 4: Apply the Fix

Now you have grounded instructions from your own docs. Apply them:

```bash
# On VPS
rsync -avz windows-pc:/path/to/tokens.json /root/.config/bots/
docker restart clawdbot-friday
docker logs -f clawdbot-friday
```

---

### Step 5: Verify & Document

```
Query NotebookLM: "What should I check after restarting a bot?"
```

**Expected answer**:
- Check container status: `docker ps`
- Verify logs show "Connected to Telegram"
- Test with `/start` command in Telegram
- Monitor for 5 minutes

---

## What MSW Did

**Without MSW**:
1. Open NotebookLM manually
2. Type question
3. Read answer
4. Copy answer
5. Paste into Claude Code
6. Repeat for each question

**With MSW**:
1. Type question in Claude Code
2. Get answer automatically
3. Done

**Time saved**: ~5 minutes per question × 10 questions/day = 50 min/day

---

## Advanced: Auto-Conversation

For deep research, use the auto-conversation engine:

```
Run deep research on VPS bot infrastructure
```

**What happens**:
- MSW asks initial question to NotebookLM
- Detects suggested follow-up topics
- Scores relevance (0-100)
- Clicks high-scoring topics automatically
- Recursively expands 10+ levels deep
- Compiles all Q&A to `.msw/research/report.md`

**Result**: Comprehensive knowledge extraction without manual clicking.

---

## Troubleshooting

**"Authentication failed"**:
- Close all Chrome instances
- Run `Check MSW health` to diagnose
- Re-run `msw_init`

**"Notebook not accessible"**:
- Verify URL is correct
- Check Google account has access
- Ensure NotebookLM sharing is enabled

**"Query timeout"**:
- Network issues - check internet connection
- NotebookLM rate limit - wait and retry
- Browser crashed - check logs

---

## Next Steps

- Try [Example 2: Feature Planning](./02-feature-planning.md)
- Read [SETUP.md](../SETUP.md) for advanced config
- Join Discord for community support (coming soon)
