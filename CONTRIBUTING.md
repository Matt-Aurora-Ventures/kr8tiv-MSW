# Contributing to MSW Protocol

Thank you for your interest in contributing to MSW! This document provides guidelines for contributing code, documentation, and bug reports.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

---

## Code of Conduct

**Be respectful, constructive, and collaborative.** We're building tools to help developers ship faster - keep that goal in mind.

---

## Getting Started

### Prerequisites

- **Node.js 18+** - [Download](https://nodejs.org)
- **Git** - For version control
- **TypeScript knowledge** - MSW is written in TypeScript
- **Playwright experience** (optional) - For browser automation work

### Quick Start

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/kr8tiv-MSW.git
cd kr8tiv-MSW

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run validation
node scripts/validate.js
```

---

## Development Setup

### 1. IDE Configuration

**Recommended**: VS Code with extensions:
- TypeScript
- Prettier
- ESLint (if configured)

### 2. Build Workflow

```bash
# Watch mode (auto-rebuild on save)
npm run check -- --watch

# Single build
npm run build

# Type-check only (no emit)
npm run check
```

### 3. Testing Workflow

```bash
# Run validation suite
node scripts/validate.js

# Run tests (when test suite is added)
npm test

# Manual testing
# Use Claude Code or Cursor to test MCP tools
```

---

## Project Structure

```
kr8tiv-MSW/
├── src/                    # Source TypeScript
│   ├── auth/              # Authentication module (R1)
│   ├── health/            # Health check module (R2)
│   ├── browser/           # Browser automation
│   ├── mcp/               # MCP server & tools
│   ├── execution/         # Ralph runner
│   ├── auto-conversation/ # Topic expansion engine
│   ├── bidirectional/     # Query/response handling
│   └── knowledge/         # Report compilation & git
├── dist/                  # Compiled JavaScript
├── scripts/               # Build & validation scripts
├── .planning/             # GSD artifacts (not committed)
├── docs/                  # Architecture & design docs
├── setup.sh               # Unix setup script
├── setup.ps1              # Windows setup script
└── package.json           # Dependencies & scripts
```

### Key Modules

| Module | Purpose | Entry Point |
|--------|---------|-------------|
| **auth** | Google OAuth & profile management | `src/auth/authenticator.ts` |
| **health** | `msw doctor` diagnostics | `src/health/checker.ts` |
| **mcp** | MCP server & tool handlers | `src/mcp/server.ts` |
| **browser** | Playwright automation | `src/browser/driver.ts` |
| **execution** | Ralph loop orchestration | `src/execution/ralph-runner.ts` |
| **auto-conversation** | Topic expansion engine | `src/auto-conversation/engine.ts` |

---

## Making Changes

### Branch Naming

- `feat/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation only
- `refactor/description` - Code refactoring
- `test/description` - Test additions

**Example**: `feat/automated-source-upload`

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add automated NotebookLM source upload

Implements PRD R3 - automated doc upload via Playwright.
Handles .md, .txt, .pdf, .docx, and URLs.

Closes #42
```

**Prefixes**:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `refactor:` - Code restructuring
- `test:` - Test additions
- `chore:` - Maintenance

### Code Style

**TypeScript Guidelines**:
- Use explicit return types for public functions
- Prefer `const` over `let`
- Use `async/await` over raw Promises
- Document complex logic with comments
- Export types alongside implementations

**Example**:
```typescript
/**
 * Authenticate with Google and NotebookLM.
 * Opens browser for manual login if not already authenticated.
 */
export async function authenticate(config?: AuthConfig): Promise<AuthResult> {
  // Implementation
}
```

### Adding New MCP Tools

1. Create tool file in `src/mcp/tools/`
2. Implement handler using `server.tool()` pattern
3. Export registrar function
4. Add to `src/mcp/tools/index.ts`
5. Update README tool table
6. Add to SETUP.md workflow examples

**Example**:
```typescript
// src/mcp/tools/msw-my-tool.ts
export function registerMswMyTool(server: McpServer): void {
  server.tool(
    "msw_my_tool",
    "Brief description of what this tool does",
    {
      param: z.string().describe("Parameter description"),
    },
    async ({ param }) => {
      // Implementation
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    }
  );
}
```

---

## Testing

### Automated Testing

```bash
# Run validation suite
node scripts/validate.js

# Expected: 17+ checks passed, 0 failures
```

### Manual Testing

1. **Build fresh**:
   ```bash
   npm run build
   ```

2. **Test in Claude Code**:
   - Restart IDE
   - Call your new tool
   - Verify output

3. **Test error cases**:
   - Invalid inputs
   - Missing configs
   - Network failures

### Test Checklist

Before submitting PR:
- [ ] `npm run build` succeeds
- [ ] `node scripts/validate.js` passes
- [ ] Manual testing in Claude Code works
- [ ] Error messages are clear and actionable
- [ ] Documentation updated (README, SETUP, etc.)
- [ ] No console warnings/errors

---

## Submitting Changes

### Pull Request Process

1. **Fork** the repository
2. **Create branch** from `master`
3. **Make changes** following guidelines above
4. **Test thoroughly** (automated + manual)
5. **Commit** with clear messages
6. **Push** to your fork
7. **Open PR** with description

### PR Description Template

```markdown
## What

Brief description of changes.

## Why

What problem does this solve? Link to issue if applicable.

## How

High-level approach taken.

## Testing

- [x] Validation suite passes
- [x] Manually tested in Claude Code
- [x] Edge cases handled

## Checklist

- [x] Code follows style guidelines
- [x] Documentation updated
- [x] Commit messages follow convention
- [x] No breaking changes (or documented if necessary)

## Screenshots

(If UI/output changes, include before/after)
```

### Review Process

1. Maintainer reviews PR
2. CI runs validation (when set up)
3. Feedback provided if needed
4. Approved → Merged
5. Contributor credited in release notes

---

## Release Process

**For Maintainers**:

1. **Version bump** in `package.json`
2. **Update CHANGELOG.md**
3. **Create git tag**: `git tag v1.0.0`
4. **Push tag**: `git push origin v1.0.0`
5. **GitHub Release** with notes
6. **Announce** on Twitter/Discord

---

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/Matt-Aurora-Ventures/kr8tiv-MSW/issues)
- **Discussions**: GitHub Discussions (coming soon)
- **Discord**: Community server (coming soon)
- **Twitter**: [@kr8tivai](https://x.com/kr8tivai)

---

## Recognition

Contributors are credited in:
- GitHub contributors page
- CHANGELOG.md for each release
- Twitter shoutouts for significant contributions

**Thank you for helping make MSW better!** 🚀

---

<p align="center">
  <sub>Built with ❤️ by the MSW community</sub>
</p>
