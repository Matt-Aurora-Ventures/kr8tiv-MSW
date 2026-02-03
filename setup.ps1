# MSW Protocol Setup Script (Windows PowerShell)
# Automated installation and configuration for Claude Code

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host   "║                     MSW Protocol Setup                        ║" -ForegroundColor Cyan
Write-Host   "║              Make Shit Work - Automated Install               ║" -ForegroundColor Cyan
Write-Host   "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$MSW_DIR = $PSScriptRoot
$CLAUDE_DIR = "$env:USERPROFILE\.claude"
$MCP_CONFIG = "$CLAUDE_DIR\mcp.json"

# Step 1: Check Node.js
Write-Host "[1/7] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js $nodeVersion installed" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found. Please install Node.js from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# Step 2: Install dependencies
Write-Host "`n[2/7] Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ npm install failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Dependencies installed" -ForegroundColor Green

# Step 3: Build TypeScript
Write-Host "`n[3/7] Building TypeScript..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Build successful" -ForegroundColor Green

# Step 4: Create .claude directory if needed
Write-Host "`n[4/7] Configuring Claude Code..." -ForegroundColor Yellow
if (-not (Test-Path $CLAUDE_DIR)) {
    New-Item -ItemType Directory -Path $CLAUDE_DIR -Force | Out-Null
    Write-Host "  ✓ Created $CLAUDE_DIR" -ForegroundColor Green
} else {
    Write-Host "  ✓ $CLAUDE_DIR exists" -ForegroundColor Green
}

# Step 5: Update MCP config
Write-Host "`n[5/7] Configuring MCP server..." -ForegroundColor Yellow
$mcpEntry = @{
    msw = @{
        command = "node"
        args = @("$MSW_DIR\dist\mcp\index.js")
    }
}

if (Test-Path $MCP_CONFIG) {
    $mcpConfig = Get-Content $MCP_CONFIG | ConvertFrom-Json
    if (-not $mcpConfig.mcpServers) {
        $mcpConfig | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value @{}
    }
    $mcpConfig.mcpServers.msw = $mcpEntry.msw
    $mcpConfig | ConvertTo-Json -Depth 10 | Set-Content $MCP_CONFIG
} else {
    @{ mcpServers = $mcpEntry } | ConvertTo-Json -Depth 10 | Set-Content $MCP_CONFIG
}
Write-Host "  ✓ MCP config updated at $MCP_CONFIG" -ForegroundColor Green

# Step 6: Verify installation
Write-Host "`n[6/7] Verifying installation..." -ForegroundColor Yellow
if (Test-Path "$MSW_DIR\dist\mcp\index.js") {
    Write-Host "  ✓ MCP server built successfully" -ForegroundColor Green
} else {
    Write-Host "  ✗ MCP server not found at dist/mcp/index.js" -ForegroundColor Red
    exit 1
}

# Step 7: Authentication setup
Write-Host "`n[7/7] Authentication setup..." -ForegroundColor Yellow
Write-Host "`n  MSW requires Google authentication to access NotebookLM." -ForegroundColor White
Write-Host "  On first use, run: " -NoNewline
Write-Host "msw_init" -ForegroundColor Cyan -NoNewline
Write-Host " in Claude Code" -ForegroundColor White
Write-Host "  This will open a browser window for Google login.`n" -ForegroundColor White

# Success
Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host   "║                  Setup Complete!                               ║" -ForegroundColor Green
Write-Host   "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart your IDE (VS Code, Cursor, Windsurf, etc.)" -ForegroundColor White
Write-Host "  2. Open Claude Code" -ForegroundColor White
Write-Host "  3. Run: " -NoNewline
Write-Host "msw_init" -ForegroundColor Cyan -NoNewline
Write-Host " in your project directory" -ForegroundColor White
Write-Host "  4. Follow the Google authentication prompt" -ForegroundColor White
Write-Host "`nDocumentation: $MSW_DIR\SETUP.md`n" -ForegroundColor Gray
