# MSW Protocol Troubleshooting Guide

Common issues and solutions when using MSW Protocol.

## Table of Contents

- [Installation Issues](#installation-issues)
- [MCP Tool Discovery](#mcp-tool-discovery)
- [Authentication Problems](#authentication-problems)
- [Browser Automation Issues](#browser-automation-issues)
- [Runtime Errors](#runtime-errors)
- [Performance Issues](#performance-issues)
- [Getting Help](#getting-help)

---

## Installation Issues

### `npm install` Fails

**Error**: `npm ERR! code ELIFECYCLE`

**Causes & Solutions**:

1. **Node.js version too old**
   ```bash
   node --version  # Must be 18+
   ```
   Solution: Install Node.js 18+ from [nodejs.org](https://nodejs.org)

2. **Corrupted `node_modules`**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Permission issues** (Linux/macOS)
   ```bash
   sudo chown -R $USER:$(id -gn $USER) ~/.npm
   npm install
   ```

### `npm run build` Fails

**Error**: TypeScript compilation errors

**Solutions**:

1. **Clean build**
   ```bash
   rm -rf dist/
   npm run build
   ```

2. **TypeScript version mismatch**
   ```bash
   npm install typescript@^5.9.3 --save-dev
   npm run build
   ```

3. **Check for file locks** (Windows)
   - Close all VS Code / IDE instances
   - Retry build

---

## MCP Tool Discovery

### Tools Don't Appear in Claude Code

**Symptom**: MSW tools not visible after installation

**Step-by-Step Diagnosis**:

1. **Check MCP config exists**
   ```bash
   # Windows
   cat ~/.claude/mcp.json

   # Linux/macOS
   cat ~/.claude/mcp.json
   ```

2. **Validate JSON syntax**
   - Copy contents to [jsonlint.com](https://jsonlint.com)
   - Fix any syntax errors (trailing commas, missing quotes, etc.)

3. **Verify absolute path**
   ```json
   {
     "mcpServers": {
       "msw": {
         "command": "node",
         "args": ["/FULL/PATH/TO/kr8tiv-MSW/dist/mcp/index.js"]
       }
     }
   }
   ```

   ❌ **Wrong**: `"./dist/mcp/index.js"` (relative path)
   ❌ **Wrong**: `"~/kr8tiv-MSW/dist/mcp/index.js"` (`~` not expanded)
   ✅ **Right**: `"/Users/you/kr8tiv-MSW/dist/mcp/index.js"` (absolute)

4. **Check file exists**
   ```bash
   ls -la /path/to/kr8tiv-MSW/dist/mcp/index.js
   ```
   If missing, run: `npm run build`

5. **Restart IDE completely**
   - Not just "Reload Window"
   - Fully quit and reopen the application

6. **Check IDE MCP logs**
   - **VS Code**: Developer Tools → Console tab
   - **Cursor**: View → Output → MCP
   - Look for errors like "spawn ENOENT" (file not found)

### Tools Appear but Don't Work

**Symptom**: Tools visible but fail when called

**Check runtime errors**:
```bash
node /path/to/kr8tiv-MSW/dist/mcp/index.js
```

If it crashes immediately:
- Missing dependencies: `npm install`
- TypeScript not built: `npm run build`
- Syntax errors in code

---

## Authentication Problems

### "Authentication failed or was cancelled"

**Cause**: Google login not completed or cancelled

**Solutions**:

1. **Run in visible mode**
   Create `.msw/config.json` in your project:
   ```json
   {
     "headless": false
   }
   ```

2. **Complete full login flow**
   - Enter email
   - Enter password
   - Complete 2FA if enabled
   - Wait for NotebookLM to fully load

3. **Check antivirus/firewall**
   - Some security software blocks Playwright
   - Temporarily disable and retry
   - Whitelist `node.exe` and `chrome.exe`

### "Target page, context or browser has been closed"

**Cause**: Chrome instance conflicts or stale profiles

**Solutions**:

1. **Close all Chrome instances**
   ```bash
   # Windows
   taskkill /F /IM chrome.exe

   # Linux/macOS
   pkill -9 chrome
   killall -9 Google\ Chrome
   ```

2. **Delete Chrome profile**
   ```bash
   # Windows
   rmdir /s /q %USERPROFILE%\.msw\chrome_profile

   # Linux/macOS
   rm -rf ~/.msw/chrome_profile
   ```

3. **Re-authenticate**
   Run `msw_init` again and complete Google login

### "Cookies not persisting"

**Cause**: Chrome profile not saving correctly

**Solution**:
1. Check write permissions on `~/.msw/` directory
2. Run with `"headless": false` to see what's happening
3. Manually verify login in the opened browser
4. Check browser console for errors

---

## Browser Automation Issues

### Playwright Install Fails

**Error**: `Failed to download Chromium`

**Solutions**:

1. **Manual browser install**
   ```bash
   npx playwright install chromium
   ```

2. **Behind corporate proxy**
   ```bash
   export HTTP_PROXY=http://proxy:port
   export HTTPS_PROXY=http://proxy:port
   npx playwright install
   ```

3. **Offline install**
   - Download browsers on a connected machine
   - Copy `~/.cache/ms-playwright` to offline machine

### "Selector not found" Errors

**Cause**: NotebookLM UI changed

**Temporary workaround**:
1. Open issue on [GitHub](https://github.com/Matt-Aurora-Ventures/kr8tiv-MSW/issues)
2. Include screenshot of NotebookLM UI
3. Wait for selector update

**Long-term**: MSW uses semantic selectors (accessibility tree), not brittle CSS classes, but UI changes can still break automation.

### Browser Crashes

**Symptom**: Chrome crashes during automation

**Solutions**:

1. **Increase timeout**
   In `.msw/config.json`:
   ```json
   {
     "browserTimeout": 60000
   }
   ```

2. **Disable GPU acceleration** (if running in Docker/VM)
   ```json
   {
     "browserArgs": ["--disable-gpu", "--disable-dev-shm-usage"]
   }
   ```

3. **Check system resources**
   - Ensure sufficient RAM (min 2GB free)
   - Close other Chrome instances

---

## Runtime Errors

### "Cannot find module" Errors

**Error**: `Error: Cannot find module './some-module.js'`

**Cause**: TypeScript not compiled or incomplete build

**Solution**:
```bash
rm -rf dist/
npm run build
```

### "ENOENT: no such file or directory"

**Error**: File path not found

**Common causes**:
1. **Relative paths** - Always use absolute paths in MCP config
2. **Windows path format** - Use forward slashes: `C:/path/to/file`
3. **Missing `.msw` directory** - Run `msw_init` first

### Job Hangs Forever

**Symptom**: `msw_research` or `msw_execute` never completes

**Diagnosis**:
1. Check job status:
   ```
   Run msw_status with job ID
   ```

2. Check for stuck browser processes:
   ```bash
   # Windows
   tasklist | findstr chrome

   # Linux/macOS
   ps aux | grep chrome
   ```

3. Kill and restart:
   ```bash
   # Kill stuck Chrome
   pkill -9 chrome

   # Retry the operation
   ```

---

## Performance Issues

### Slow Research Extraction

**Symptom**: `msw_research` takes >5 minutes

**Causes & Solutions**:

1. **Too many topics to expand**
   - Increase relevance threshold in config
   - Limit max depth

2. **Slow internet connection**
   - NotebookLM requires good connectivity
   - Check network latency

3. **Rate limiting**
   - NotebookLM may throttle requests
   - Add delays between queries

### High Memory Usage

**Symptom**: Node.js using >1GB RAM

**Cause**: Chrome instances not closing

**Solution**:
1. Ensure proper cleanup in code
2. Restart MSW MCP server
3. Monitor with:
   ```bash
   # Windows
   tasklist | findstr node

   # Linux/macOS
   ps aux | grep node
   ```

---

## Getting Help

### Before Opening an Issue

1. **Run diagnostics**:
   ```
   Run msw_status to get system info
   ```

2. **Check logs**:
   - MCP server logs (IDE console)
   - Browser console (if visible)
   - System error logs

3. **Minimal reproduction**:
   - What command did you run?
   - What was the exact error message?
   - What's your OS and Node.js version?

### Where to Ask

| Type | Location |
|------|----------|
| Bug reports | [GitHub Issues](https://github.com/Matt-Aurora-Ventures/kr8tiv-MSW/issues) |
| Questions | GitHub Discussions (coming soon) |
| Community | Discord (coming soon) |
| Twitter | [@kr8tivai](https://x.com/kr8tivai) |

### Include These Details

```
**Environment**:
- OS: [Windows 11 / macOS 14 / Ubuntu 22.04]
- Node.js: [v18.x.x]
- MSW version: [git commit hash]
- IDE: [Claude Code / Cursor / Windsurf]

**What I Did**:
[Steps to reproduce]

**What Happened**:
[Actual result / error message]

**What I Expected**:
[Expected result]

**Logs**:
```
[Paste relevant logs]
```
```

---

## Known Issues

### Windows-Specific

- **Path separators**: Use forward slashes (`/`) even on Windows
- **Antivirus interference**: Windows Defender may block Playwright
- **PowerShell execution policy**: Run `Set-ExecutionPolicy RemoteSigned`

### macOS-Specific

- **Gatekeeper warnings**: Allow Chrome.app in System Preferences → Security
- **Disk permissions**: Grant Terminal full disk access

### Linux-Specific

- **Missing dependencies**: Install `libnss3`, `libatk-bridge2.0-0`, etc.
- **Headless mode**: Requires X11 or use `--disable-gpu`

---

**Still stuck? Open an issue with full details and we'll help!**
