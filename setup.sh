#!/usr/bin/env bash
# MSW Protocol Setup Script (Unix/Linux/macOS)
# Automated installation and configuration for Claude Code

set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                     MSW Protocol Setup                        ║"
echo "║              Make Shit Work - Automated Install               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

MSW_DIR="$(cd "$(dirname "$0")" && pwd)"
CLAUDE_DIR="$HOME/.claude"
MCP_CONFIG="$CLAUDE_DIR/mcp.json"

# Step 1: Check Node.js
echo "[1/7] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "  ✗ Node.js not found. Please install Node.js from https://nodejs.org"
    exit 1
fi
NODE_VERSION=$(node --version)
echo "  ✓ Node.js $NODE_VERSION installed"

# Step 2: Install dependencies
echo ""
echo "[2/7] Installing dependencies..."
npm install
echo "  ✓ Dependencies installed"

# Step 3: Build TypeScript
echo ""
echo "[3/7] Building TypeScript..."
npm run build
echo "  ✓ Build successful"

# Step 4: Create .claude directory if needed
echo ""
echo "[4/7] Configuring Claude Code..."
mkdir -p "$CLAUDE_DIR"
echo "  ✓ $CLAUDE_DIR ready"

# Step 5: Update MCP config
echo ""
echo "[5/7] Configuring MCP server..."
if [ -f "$MCP_CONFIG" ]; then
    # Update existing config
    jq --arg path "$MSW_DIR/dist/mcp/index.js" \
       '.mcpServers.msw = {command: "node", args: [$path]}' \
       "$MCP_CONFIG" > "$MCP_CONFIG.tmp" && mv "$MCP_CONFIG.tmp" "$MCP_CONFIG"
else
    # Create new config
    cat > "$MCP_CONFIG" << EOF
{
  "mcpServers": {
    "msw": {
      "command": "node",
      "args": ["$MSW_DIR/dist/mcp/index.js"]
    }
  }
}
EOF
fi
echo "  ✓ MCP config updated at $MCP_CONFIG"

# Step 6: Verify installation
echo ""
echo "[6/7] Verifying installation..."
if [ -f "$MSW_DIR/dist/mcp/index.js" ]; then
    echo "  ✓ MCP server built successfully"
else
    echo "  ✗ MCP server not found at dist/mcp/index.js"
    exit 1
fi

# Step 7: Authentication setup
echo ""
echo "[7/7] Authentication setup..."
echo ""
echo "  MSW requires Google authentication to access NotebookLM."
echo "  On first use, run: msw_init in Claude Code"
echo "  This will open a browser window for Google login."
echo ""

# Success
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                  Setup Complete!                               ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

echo "Next steps:"
echo "  1. Restart your IDE (VS Code, Cursor, Windsurf, etc.)"
echo "  2. Open Claude Code"
echo "  3. Run: msw_init in your project directory"
echo "  4. Follow the Google authentication prompt"
echo ""
echo "Documentation: $MSW_DIR/SETUP.md"
echo ""
