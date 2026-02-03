# Phase 8: CI/CD Pipeline - Research

**Researched:** 2026-02-03
**Domain:** GitHub Actions, CI/CD automation, TypeScript build validation, multi-Node testing, security scanning, automated releases
**Confidence:** HIGH

## Summary

Phase 8 establishes a comprehensive CI/CD pipeline using GitHub Actions to automate testing, linting, type checking, security scanning, and releases. The project already has a basic test workflow (`.github/workflows/test.yml`) that runs Vitest with coverage across Node 18/20/22, uploads to Codecov, and comments coverage on PRs.

The primary work involves: (1) adding ESLint/Prettier enforcement workflows, (2) implementing TypeScript build artifact validation (check-dist pattern), (3) adding E2E health checks against live NotebookLM, (4) implementing PR quality gates with branch protection, (5) adding security scanning for dependency vulnerabilities, (6) setting up automated semantic releases with changelog generation, (7) implementing coverage regression detection, and (8) configuring composite actions for reusable workflow components.

**Primary recommendation:** Use GitHub Actions workflows with matrix testing for Node versions, implement check-dist pattern for build validation, use vitest-coverage-report-action for PR coverage comments with regression detection, add semantic-release for automated versioning, use npm audit + dependency-review-action for security scanning, and configure branch protection rules to enforce all quality gates.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| [GitHub Actions](https://docs.github.com/en/actions) | Latest | CI/CD platform | Native GitHub integration, free for public repos, matrix builds |
| [actions/setup-node](https://github.com/actions/setup-node) | v4 | Node.js environment setup | Official action, caching support, version matrix |
| [actions/checkout](https://github.com/actions/checkout) | v4 | Repository checkout | Official action, full git history support |
| [semantic-release](https://github.com/semantic-release/semantic-release) | Latest | Automated versioning & releases | Industry standard, commit convention-based, changelog generation |
| [vitest-coverage-report-action](https://github.com/davelosert/vitest-coverage-report-action) | Latest | Coverage reporting & PR comments | Native Vitest support, regression detection, threshold enforcement |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| [@semantic-release/changelog](https://github.com/semantic-release/changelog) | Latest | Changelog generation | Automated release notes |
| [@semantic-release/git](https://github.com/semantic-release/git) | Latest | Commit changelog to repo | Version bumps in package.json |
| [ESLint](https://eslint.org/) | ^9.x | JavaScript/TypeScript linting | Code quality enforcement |
| [Prettier](https://prettier.io/) | ^3.x | Code formatting | Consistent code style |
| [actions/dependency-review-action](https://github.com/actions/dependency-review-action) | Latest | Dependency vulnerability scanning | PR security checks |
| [codecov/codecov-action](https://github.com/codecov/codecov-action) | v4 | Coverage upload | Already in use, historical tracking |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| GitHub Actions | CircleCI, Travis CI | GitHub Actions is free, native integration, no third-party setup |
| semantic-release | manual versioning | Manual is error-prone, semantic-release automates based on commits |
| npm audit | Snyk, Trivy, Mend | npm audit is built-in, free; Snyk/Trivy offer more features but cost/complexity |
| vitest-coverage-report-action | codecov/codecov-action alone | vitest-coverage-report adds PR comments, regression detection, threshold visualization |

**Installation:**
```bash
# ESLint + Prettier
npm install -D eslint @eslint/js @types/eslint__js typescript-eslint prettier eslint-config-prettier

# Semantic release
npm install -D semantic-release @semantic-release/changelog @semantic-release/git

# No action installation needed - GitHub Actions runs in cloud
```

## Architecture Patterns

### Recommended Workflow Structure
```
.github/
├── workflows/
│   ├── test.yml                 # Test suite (already exists - multi-node matrix)
│   ├── lint.yml                 # ESLint + Prettier enforcement
│   ├── typecheck.yml            # TypeScript type checking
│   ├── build.yml                # Build validation + check-dist
│   ├── e2e-health.yml           # E2E health checks against live NotebookLM
│   ├── security.yml             # Dependency vulnerability scanning
│   └── release.yml              # Semantic release (on main branch push)
└── actions/
    └── setup-node-with-cache/   # Composite action for Node setup
        └── action.yml
```

### Pattern 1: Multi-Node Version Matrix Testing
**What:** Run tests across multiple Node.js versions in parallel to ensure compatibility.
**When to use:** Always - critical for libraries/tools with broad Node.js support.
**Example:**
```yaml
# .github/workflows/test.yml (already exists, reference pattern)
name: Test Suite

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x, 22.x]
      fail-fast: false  # Continue other versions if one fails

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage (Node 20 only)
        if: matrix.node-version == '20.x'
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
```

### Pattern 2: ESLint/Prettier Enforcement
**What:** Run linting and formatting checks on every PR to enforce code quality standards.
**When to use:** Always - prevents style inconsistencies and catches common errors.
**Example:**
```yaml
# .github/workflows/lint.yml
name: Lint

on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]

jobs:
  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check Prettier formatting
        run: npm run format:check
```

### Pattern 3: TypeScript Build Validation (check-dist)
**What:** Ensure TypeScript source compiles successfully and dist/ artifacts are up-to-date.
**When to use:** Always for TypeScript projects with committed dist/ folders.
**Example:**
```yaml
# .github/workflows/build.yml
name: Build Validation

on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript type check
        run: npm run check

      - name: Build distribution
        run: npm run build

      - name: Verify dist/ is up-to-date
        run: |
          if [ -n "$(git status --porcelain dist/)" ]; then
            echo "::error::dist/ directory is out of sync with source. Run 'npm run build' locally and commit changes."
            git diff dist/
            exit 1
          fi

      - name: Upload dist/ artifact (on failure)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: expected-dist
          path: dist/
```

### Pattern 4: Coverage Regression Detection
**What:** Detect when PR reduces code coverage and fail if thresholds not met.
**When to use:** Always - prevents coverage decay over time.
**Example:**
```yaml
# .github/workflows/test.yml (enhancement to existing workflow)
jobs:
  test:
    # ... existing matrix setup ...

    steps:
      # ... existing steps ...

      - name: Vitest Coverage Report
        if: github.event_name == 'pull_request' && matrix.node-version == '20.x'
        uses: davelosert/vitest-coverage-report-action@v2
        with:
          json-summary-path: ./coverage/coverage-summary.json
          json-final-path: ./coverage/coverage-final.json
          file-coverage-mode: changes
          # Fail if any file coverage drops below threshold
          vite-config-path: ./vitest.config.ts
```

### Pattern 5: E2E Health Check Against Live NotebookLM
**What:** Run E2E test against real NotebookLM to validate selectors/auth still work.
**When to use:** Scheduled (nightly) and manual dispatch to catch NotebookLM UI changes.
**Example:**
```yaml
# .github/workflows/e2e-health.yml
name: E2E Health Check

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
  workflow_dispatch:      # Allow manual trigger

jobs:
  e2e-health:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E health check
        env:
          NOTEBOOKLM_URL: ${{ secrets.NOTEBOOKLM_TEST_URL }}
          # Use GitHub Actions secrets for test credentials
        run: npm run test:e2e:health

      - name: Upload Playwright traces
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces
          path: test-results/

      - name: Create issue on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'E2E Health Check Failed',
              body: 'The nightly E2E health check against live NotebookLM failed. Check workflow run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}',
              labels: ['e2e-failure', 'automation']
            })
```

### Pattern 6: Security Scanning (Dependency Vulnerabilities)
**What:** Scan dependencies for known vulnerabilities on every PR.
**When to use:** Always - prevents merging PRs with vulnerable dependencies.
**Example:**
```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  dependency-review:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'

    steps:
      - uses: actions/checkout@v4

      - name: Dependency Review
        uses: actions/dependency-review-action@v4
        with:
          fail-on-severity: moderate
          deny-licenses: GPL-2.0, GPL-3.0

  npm-audit:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Run npm audit
        run: npm audit --audit-level=moderate
```

### Pattern 7: Semantic Release (Automated Versioning & Changelog)
**What:** Automatically determine version bumps, generate changelog, tag releases based on commit messages.
**When to use:** On main branch pushes (after PR merge).
**Example:**
```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches:
      - main
      - master

jobs:
  release:
    runs-on: ubuntu-latest

    permissions:
      contents: write  # For creating releases and tags
      issues: write    # For commenting on issues
      pull-requests: write  # For commenting on PRs

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full git history for changelog

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build distribution
        run: npm run build

      - name: Semantic Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}  # If publishing to npm
        run: npx semantic-release
```

**Semantic Release Configuration:**
```json
// .releaserc.json
{
  "branches": ["main", "master"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    ["@semantic-release/npm", {
      "npmPublish": false  // Set true if publishing to npm
    }],
    "@semantic-release/github",
    ["@semantic-release/git", {
      "assets": ["package.json", "CHANGELOG.md"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }]
  ]
}
```

### Pattern 8: Composite Actions for Reusability
**What:** Extract common workflow steps into reusable composite actions.
**When to use:** When multiple workflows share identical setup steps.
**Example:**
```yaml
# .github/actions/setup-node-with-cache/action.yml
name: 'Setup Node with Cache'
description: 'Setup Node.js with npm cache'

inputs:
  node-version:
    description: 'Node.js version'
    required: true
    default: '20.x'

runs:
  using: 'composite'
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ inputs.node-version }}
        cache: 'npm'

    - name: Install dependencies
      shell: bash
      run: npm ci

# Usage in workflow:
# - uses: ./.github/actions/setup-node-with-cache
#   with:
#     node-version: '20.x'
```

### Anti-Patterns to Avoid
- **Hardcoding secrets in workflows:** Always use `${{ secrets.SECRET_NAME }}`
- **Running tests without fail-fast: false:** One Node version failure shouldn't block others
- **Not caching dependencies:** Wastes time re-downloading; use `cache: 'npm'` in setup-node
- **Committing node_modules/ or coverage/ to git:** These bloat repo; add to .gitignore
- **Using `npm install` instead of `npm ci` in CI:** `npm ci` is faster, deterministic
- **Not pinning action versions:** Use `@v4` or commit SHA, not `@main`
- **Exposing secrets in logs:** GitHub masks secrets, but avoid echo/print statements
- **Running E2E against live services on every commit:** Use mocks for PRs, live checks scheduled

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coverage PR comments | Custom script parsing coverage JSON | `vitest-coverage-report-action` | Handles regression detection, threshold visualization, multi-file modes |
| Automated versioning | Shell script parsing commits | `semantic-release` | Industry standard, changelog generation, plugin ecosystem |
| Dependency vulnerability scanning | Manual `npm audit` parsing | `actions/dependency-review-action` | Integrates with GitHub Advisory Database, license checks, severity filtering |
| Build artifact validation | Custom git diff script | `check-dist` pattern from actions/typescript-action | Handles edge cases, uploads artifacts on failure, clear error messages |
| Branch protection setup | Manual GitHub UI clicks | GitHub API + Infrastructure as Code (Terraform) | Reproducible, version-controlled, automated |
| Secret rotation | Manual process | HashiCorp Vault, AWS Secrets Manager | Automated rotation, audit logs, access controls |
| Test result reporting | Custom HTML generation | GitHub Actions built-in annotations, codecov | Native integration, historical tracking, PR comments |

**Key insight:** GitHub Actions has a mature ecosystem (2026) with battle-tested actions for common CI/CD tasks. Reusing standard actions reduces maintenance burden and leverages community expertise.

## Common Pitfalls

### Pitfall 1: Coverage Regression Not Detected
**What goes wrong:** Coverage drops over time without anyone noticing, quality degrades.
**Why it happens:** Coverage reports are uploaded but not enforced; thresholds not configured per-file.
**How to avoid:**
- Use `vitest-coverage-report-action` with `file-coverage-mode: changes` to show regression on changed files
- Configure per-file thresholds in `vitest.config.ts` for critical paths (auth, backup, browser) at 80%+
- Set global thresholds at 70% minimum
- Fail CI if thresholds not met
**Warning signs:**
- Coverage percentage dropping in successive PRs
- Critical modules have low coverage (< 70%)
- No PR comments showing coverage changes

### Pitfall 2: E2E Tests Fail Silently Due to NotebookLM UI Changes
**What goes wrong:** NotebookLM updates their UI, selectors break, E2E tests fail but not detected until prod deploy.
**Why it happens:** E2E tests only run on PRs against mock UI, not live NotebookLM.
**How to avoid:**
- Schedule nightly E2E health checks against live NotebookLM
- Create GitHub issue automatically on failure
- Use semantic selectors (aria-label, role) instead of brittle class names
- Document expected NotebookLM UI structure in tests
**Warning signs:**
- Prod issues reported but tests passing
- Selectors using class names like `.css-abc123`
- No scheduled E2E health checks configured

### Pitfall 3: Secrets Exposed in Logs
**What goes wrong:** Secrets accidentally printed to logs, visible in Actions output, security breach.
**Why it happens:** Developer adds debug logging with `console.log(process.env)` or similar.
**How to avoid:**
- GitHub automatically masks secrets, but avoid echo/print statements
- Use `::add-mask::` command to mask runtime values
- Review logs before merging PRs
- Use secret scanning tools (GitHub Advanced Security)
**Warning signs:**
- Logs showing environment variables
- Debug statements printing entire config objects
- Test failures exposing credentials

### Pitfall 4: Branch Protection Not Enforced
**What goes wrong:** PRs merged without passing checks, breaking main branch.
**Why it happens:** Branch protection rules not configured or missing required status checks.
**How to avoid:**
- Configure branch protection on `main`/`master` branch:
  - Require status checks: `test / test (18.x)`, `test / test (20.x)`, `test / test (22.x)`, `lint`, `build`, `security`
  - Require branches up to date before merging
  - Require pull request reviews (1+ approver)
  - No force pushes or deletions
- Use GitHub API or Terraform to codify protection rules
**Warning signs:**
- Main branch has failing tests
- PRs merged with failing checks
- No review required for merges

### Pitfall 5: Dependency Vulnerabilities Merged
**What goes wrong:** PR introduces vulnerable dependency, security scanner not run or ignored.
**Why it happens:** Security workflow not configured or `fail_ci_if_error: false`.
**How to avoid:**
- Add `actions/dependency-review-action` to PR workflow
- Set `fail-on-severity: moderate` to fail on medium+ vulnerabilities
- Run `npm audit` on schedule (weekly) to catch new CVEs
- Configure Dependabot to auto-update dependencies
**Warning signs:**
- `npm audit` shows vulnerabilities in production
- No security scanning workflow
- Dependabot alerts ignored

### Pitfall 6: Flaky E2E Tests Block CI
**What goes wrong:** E2E tests occasionally fail due to timing issues, blocking legitimate PRs.
**Why it happens:** Tests not using Playwright auto-waiting, race conditions in browser automation.
**How to avoid:**
- Use Playwright's built-in waiting (`waitForSelector`, `waitForLoadState`)
- Configure test retries: `test.retry(2)` in Vitest for E2E tests
- Increase timeouts for slow operations: `test.timeout(60_000)`
- Use mock NotebookLM UI for deterministic tests in CI
- Run live E2E tests separately (nightly schedule, not blocking PRs)
**Warning signs:**
- Tests pass locally but fail in CI intermittently
- Test failures with "element not found" or "timeout" errors
- CI blocked by transient failures

### Pitfall 7: Semantic Release Fails Due to Commit Message Format
**What goes wrong:** Semantic release can't determine version bump, no release created.
**Why it happens:** Commit messages don't follow Angular convention (feat:, fix:, BREAKING CHANGE:).
**How to avoid:**
- Add commitlint to enforce commit message format
- Use `.commitlintrc.json` with `@commitlint/config-conventional`
- Add git hook (husky) to validate commit messages locally
- Document commit convention in CONTRIBUTING.md
**Warning signs:**
- Semantic release workflow runs but no release created
- Commit messages like "updates", "fixes", "wip"
- No automated version bumps

### Pitfall 8: Build Artifacts Out of Sync
**What goes wrong:** `dist/` committed to repo doesn't match source code, prod deploys broken code.
**Why it happens:** Developer forgets to run `npm run build` before commit, or build script changed.
**How to avoid:**
- Implement check-dist workflow (Pattern 3 above)
- Fail CI if `git status --porcelain dist/` shows changes after build
- Upload expected `dist/` artifact on failure for debugging
- Consider NOT committing `dist/` to repo (build in CI instead)
**Warning signs:**
- Runtime errors in production but tests pass
- `dist/index.js` has outdated code
- Build script changes not reflected in dist/

## Code Examples

Verified patterns from official sources:

### ESLint Configuration (Flat Config)
```javascript
// eslint.config.js
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ['dist/', 'coverage/', 'node_modules/']
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
);
```

### Prettier Configuration
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always"
}
```

### Package.json Scripts
```json
{
  "scripts": {
    "build": "tsc",
    "check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e:health": "vitest run --config vitest.e2e.config.ts tests/e2e/health-check.test.ts",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### Branch Protection Configuration (GitHub API)
```javascript
// scripts/setup-branch-protection.js
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

await octokit.repos.updateBranchProtection({
  owner: 'your-org',
  repo: 'msw-protocol',
  branch: 'main',
  required_status_checks: {
    strict: true,  // Require branches to be up to date
    contexts: [
      'test / test (18.x)',
      'test / test (20.x)',
      'test / test (22.x)',
      'lint',
      'build',
      'security / dependency-review',
      'security / npm-audit'
    ]
  },
  enforce_admins: true,
  required_pull_request_reviews: {
    required_approving_review_count: 1,
    dismiss_stale_reviews: true,
    require_code_owner_reviews: false
  },
  restrictions: null,
  allow_force_pushes: false,
  allow_deletions: false
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single Node version testing | Matrix testing (18, 20, 22) | 2024 | Catches compatibility issues early |
| Manual versioning | semantic-release | 2021+ | Automated, deterministic, changelog generation |
| Istanbul coverage | V8 coverage | 2023+ | Faster, native Node runtime matching |
| ESLint 8 | ESLint 9 (flat config) | 2024 | Simplified config, better TypeScript support |
| codecov alone | vitest-coverage-report-action | 2025+ | PR comments, regression detection, threshold visualization |
| Manual npm audit | actions/dependency-review-action | 2024+ | Automated, integrated with GitHub Advisory Database |
| Long-lived tokens | OIDC tokens | 2025+ | Enhanced security, no credential storage |
| Reusable workflows only | Composite actions + reusable workflows | 2024+ | Granular reusability, step-level sharing |

**Deprecated/outdated:**
- **ESLint 8 `.eslintrc.js`:** Use flat config `eslint.config.js` (ESLint 9+)
- **Codecov action v3:** Use v4 (improved performance, attestation support)
- **npm audit JSON parsing:** Use `actions/dependency-review-action` for structured scanning
- **GitHub Actions `::set-output`:** Use `$GITHUB_OUTPUT` file (deprecated 2022)
- **Node 16 in CI:** End-of-life April 2024; use 18, 20, 22

## Open Questions

1. **Should dist/ be committed to git?**
   - What we know: check-dist pattern validates dist/ is up-to-date
   - What's unclear: Whether to commit dist/ or build in CI only
   - Recommendation: Commit dist/ for MCP servers (npm packages need it for npx), validate with check-dist. Alternative: Use `prepublishOnly` script to build before npm publish, don't commit dist/ to reduce git bloat.

2. **How to handle NotebookLM authentication in CI?**
   - What we know: Playwright can persist auth state via `storageState`
   - What's unclear: How to securely store Google session cookies for CI E2E tests
   - Recommendation: Create dedicated test Google account, authenticate once in CI, save `storageState` as GitHub secret (encrypted JSON). Rotate weekly. For scheduled health checks only, not PR workflows (use mock UI for PRs).

3. **Should we publish to npm?**
   - What we know: MCP servers can be distributed via npm for `npx` usage
   - What's unclear: Whether this project should be public npm package or private
   - Recommendation: Start private (no npm publish), add publishing later if needed. Configure `"npmPublish": false` in semantic-release.

4. **What Node.js versions to support?**
   - What we know: Phase 7 tests already use 18, 20, 22 matrix
   - What's unclear: When to drop Node 18 (EOL April 2025)
   - Recommendation: Keep 18, 20, 22 for now (CI-02 requirement). Drop 18 in Q2 2026 after EOL, add Node 24 LTS when released (expected Oct 2026).

5. **How to handle Playwright browser installations in CI?**
   - What we know: `npx playwright install --with-deps` installs browsers + system deps
   - What's unclear: Whether to cache Playwright browsers between runs
   - Recommendation: Don't cache browsers (complex, size issues). Install fresh each run with `--with-deps` flag. Takes ~30s, acceptable for E2E health check workflow (not blocking PRs).

## Sources

### Primary (HIGH confidence)

**GitHub Actions Official Documentation:**
- [Building and testing Node.js - GitHub Docs](https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs)
- [Managing a branch protection rule - GitHub Docs](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)
- [Secrets - GitHub Docs](https://docs.github.com/en/actions/concepts/security/secrets)
- [Reusing workflow configurations - GitHub Actions](https://docs.github.com/en/actions/concepts/workflows-and-actions/reusing-workflow-configurations)

**Playwright Official Documentation:**
- [Setting up CI | Playwright](https://playwright.dev/docs/ci-intro)
- [Authentication | Playwright](https://playwright.dev/docs/auth)

**GitHub Actions TypeScript Template:**
- [actions/typescript-action check-dist.yml](https://github.com/actions/typescript-action/blob/main/.github/workflows/check-dist.yml)

**Semantic Release:**
- [semantic-release/semantic-release - GitHub](https://github.com/semantic-release/semantic-release)
- [semantic-release/changelog - GitHub](https://github.com/semantic-release/changelog)

**Vitest Coverage Report Action:**
- [davelosert/vitest-coverage-report-action - GitHub](https://github.com/davelosert/vitest-coverage-report-action)

### Secondary (MEDIUM confidence)

**Best Practices Guides (2025-2026):**
- [TypeScript CI/CD Pipeline using Docker, GitHub Actions, Kubernetes, ArgoCD, Trivy and ESLint - DEV Community](https://dev.to/pipscript/building-a-secure-cicd-pipeline-for-a-typescript-application-using-github-actions-and-argocd-2142)
- [Code and security checks in TypeScript projects with Github Actions](https://www.maxivanov.io/code-and-security-checks-in-typescript-projects-with-github-actions/)
- [How to Set Up Matrix Builds in GitHub Actions](https://oneuptime.com/blog/post/2025-12-20-github-actions-matrix-builds/view)
- [Vitest Code Coverage with GitHub Actions: Report, Compare, and Block PRs on Low Coverage - Medium](https://medium.com/@alvarado.david/vitest-code-coverage-with-github-actions-report-compare-and-block-prs-on-low-coverage-67fceaa79a47)
- [Automated versioning and package publishing using GitHub Actions and semantic-release - DEV Community](https://dev.to/kouts/automated-versioning-and-package-publishing-using-github-actions-and-semantic-release-1kce)

**Security & Secrets Management:**
- [Best Practices for Managing Secrets in GitHub Actions | Blacksmith](https://www.blacksmith.sh/blog/best-practices-for-managing-secrets-in-github-actions)
- [8 GitHub Actions Secrets Management Best Practices - StepSecurity](https://www.stepsecurity.io/blog/github-actions-secrets-management-best-practices)
- [How to secure a software project with GitHub Actions: dependency vulnerability scanning](https://woliveiras.github.io/posts/how-to-secure-project-github-actions-dependency-vulnerability-scanning/)

**GitHub Actions Ecosystem:**
- [GitHub Actions — Create a Testing Matrix](https://futurestud.io/tutorials/github-actions-create-a-testing-matrix)
- [Composite Actions vs Reusable Workflows: what is the difference? - DEV Community](https://dev.to/n3wt0n/composite-actions-vs-reusable-workflows-what-is-the-difference-github-actions-11kd)
- [ESLint + Prettier Configuration That Actually Works - Medium](https://medium.com/@osmion/prettier-eslint-configuration-that-actually-works-without-the-headaches-a8506b710d21)

### Tertiary (LOW confidence)

**Community Discussions:**
- [Playwright GitHub Actions E2E testing CI pipeline 2026](https://talent500.com/blog/github-action-integration-with-playwright/)
- [Code Reviews at Scale: CODEOWNERS & GitHub Actions Guide](https://www.aviator.co/blog/code-reviews-at-scale/)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - GitHub Actions is industry standard for GitHub repos, semantic-release widely adopted
- Architecture: HIGH - Patterns verified from official docs and established templates
- Pitfalls: HIGH - Based on common CI/CD mistakes and mitigation strategies in official docs

**Research date:** 2026-02-03
**Valid until:** 2026-04-03 (60 days - GitHub Actions stable, slow evolution)

**Notes:**
- Existing `.github/workflows/test.yml` already implements multi-node matrix testing (CI-01, CI-02) and coverage upload (CI-08 partial)
- No ESLint/Prettier config exists yet - needs to be added (CI-04)
- No security scanning configured - needs dependency-review-action (CI-09)
- No automated releases - needs semantic-release setup (CI-10)
- E2E health check workflow needed for live NotebookLM testing (CI-06)
- Build validation (check-dist) needed for TypeScript artifact verification (CI-05)
- Coverage regression detection partially implemented via codecov, but vitest-coverage-report-action provides better PR integration (CI-08)
