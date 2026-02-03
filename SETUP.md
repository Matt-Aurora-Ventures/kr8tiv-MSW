# MSW Protocol Setup Guide

Complete installation and configuration instructions for MSW Protocol.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Install](#quick-install)
- [Manual Setup](#manual-setup)
- [Authentication Setup](#authentication-setup)
- [Verification](#verification)
- [First Use](#first-use)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before installing MSW, ensure you have:

- **Node.js 18+** - [Download](https://nodejs.org)
- **Claude Code, Cursor, or Windsurf** - IDE with MCP support
- **Google Account** - For NotebookLM access
- **Git** - For cloning the repository

---

## Quick Install

### Windows (PowerShell)

```powershell
# Clone repository
git clone https://github.com/Matt-Aurora-Ventures/kr8tiv-MSW.git
cd kr8tiv-MSW

# Run setup script
.\setup.ps1

# Restart your IDE
```

### Linux/macOS (Bash)

```bash
# Clone repository
git clone https://github.com/Matt-Aurora-Ventures/kr8tiv-MSW.git
cd kr8tiv-MSW

# Run setup script
chmod +x setup.sh
./setup.sh

# Restart your IDE
```

The setup script will:
1. Verify Node.js installation
2. Install npm dependencies
3. Build TypeScript to `dist/`
4. Configure `~/.claude/mcp.json`
5. Prepare authentication flow

---

## Manual Setup

If you prefer manual installation:

### 1. Clone and Build

```bash
git clone https://github.com/Matt-Aurora-Ventures/kr8tiv-MSW.git
cd kr8tiv-MSW
npm install
npm run build
```

### 2. Configure MCP

Add MSW to your MCP configuration file:

**Claude Code** (`~/.claude/mcp.json`):
```json
{
  "mcpServers": {
    "msw": {
      "command": "node",
      "args": ["/absolute/path/to/kr8tiv-MSW/dist/mcp/index.js"]
    }
  }
}
```

**Cursor** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "msw": {
      "command": "node",
      "args": ["/absolute/path/to/kr8tiv-MSW/dist/mcp/index.js"]
    }
  }
}
```

**Windsurf** (`~/.codeium/windsurf/mcp_config.json`):
```json
{
  "mcpServers": {
    "msw": {
      "command": "node",
      "args": ["/absolute/path/to/kr8tiv-MSW/dist/mcp/index.js"]
    }
  }
}
```

**⚠️ IMPORTANT**: Use absolute paths, not relative paths.

### 3. Restart IDE

After updating `mcp.json`, **fully restart your IDE** (not just reload window).

---

## Authentication Setup

MSW uses Playwright to access NotebookLM, which requires Google authentication.

### First-Time Authentication

1. **Run `msw_init` in Claude Code**:
   ```
   Initialize MSW in your project directory
   ```

2. **Browser Opens Automatically**:
   - A Chrome window will open
   - You'll see the Google login page
   - This is expected and safe

3. **Sign In**:
   - Use your Google account credentials
   - Grant NotebookLM access if prompted
   - Complete any 2FA if enabled

4. **Authentication Persists**:
   - Your Chrome profile is saved to `~/.msw/chrome_profile`
   - Future sessions reuse this auth (no re-login)

### Headless Mode

By default, MSW runs in **headless mode** (no visible browser).

To see the browser during debugging:
```json
{
  "headless": false
}
```
Add this to your `.msw/config.json` (created after `msw_init`).

### Troubleshooting Auth

**"Authentication failed or was cancelled"**
- Make sure you completed the login flow
- Check if 2FA codes were entered
- Try running with `"headless": false` to see what's happening

**"Target page, context or browser has been closed"**
- Close all Chrome instances before running MSW
- Delete `~/.msw/chrome_profile` and re-authenticate
- Check if an antivirus is blocking Playwright

---

## Verification

After setup, verify MSW is working:

### 1. Check MCP Registration

In Claude Code, the following tools should appear:
- `msw_init`
- `msw_status`
- `msw_research`
- `msw_plan`
- `msw_execute`
- `msw_verify`
- `msw_notebook_add`

If tools don't appear:
1. Check `~/.claude/mcp.json` syntax (must be valid JSON)
2. Verify absolute path to `dist/mcp/index.js`
3. Restart IDE completely
4. Check IDE MCP logs for errors

### 2. Test MSW Init

Run in Claude Code:
```
Initialize MSW for this project
```

Expected output:
```json
{
  "success": true,
  "mswDir": "/your/project/.msw",
  "configCreated": true,
  "notebooksLinked": 0
}
```

### 3. Test Health Check

```
Check MSW status
```

Expected output shows:
- MCP server running
- Chrome profile path
- Authentication status
- Linked notebooks

---

## First Use

### Example Workflow

1. **Initialize Project**:
   ```
   Run msw_init in this directory
   ```

2. **Link NotebookLM Notebook**:
   ```
   Add this NotebookLM notebook: https://notebooklm.google.com/notebook/abc123
   ```

3. **Run Research**:
   ```
   Run msw_research to extract knowledge from the notebook
   ```

4. **Generate PRD** (GSD integration):
   ```
   Create a PRD from research findings
   ```

5. **Execute with Ralph Loop**:
   ```
   Run msw_execute to implement the plan
   ```

6. **Verify Implementation**:
   ```
   Run msw_verify to validate against requirements
   ```

---

## Troubleshooting

### Tools Not Appearing

**Symptom**: MSW tools don't show up in Claude Code

**Solutions**:
1. Check `~/.claude/mcp.json` syntax with a JSON validator
2. Use absolute paths (not `~` or `./`)
3. Verify `dist/mcp/index.js` exists (run `npm run build`)
4. Restart IDE (not just reload)
5. Check IDE developer console for MCP errors

### Build Fails

**Symptom**: `npm run build` fails with TypeScript errors

**Solutions**:
1. Delete `node_modules` and `package-lock.json`
2. Run `npm install` again
3. Verify Node.js version: `node --version` (must be 18+)
4. Check for file permission issues

### Authentication Issues

See [Authentication Setup](#authentication-setup) above.

### Rate Limits

NotebookLM free tier: **~50 queries/day**

If you hit rate limits:
- MSW will display a warning
- Wait 24 hours for limit reset
- Consider upgrading to Google AI Premium

### Still Having Issues?

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for detailed error solutions
2. Open an issue on [GitHub](https://github.com/Matt-Aurora-Ventures/kr8tiv-MSW/issues)
3. Join the community Discord (coming soon)

---

## Next Steps

Once setup is complete:
- Read the [README.md](./README.md) for architecture overview
- Check [docs/](./docs/) for detailed guides
- Try the example workflows in `examples/` (coming soon)

**Ready to make shit work? 🚀**
