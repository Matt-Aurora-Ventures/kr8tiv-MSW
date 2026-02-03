/**
 * Health Checker - Diagnoses MSW setup and configuration issues
 *
 * Implements the "msw doctor" command from PRD R2.
 * Checks all critical components and provides actionable fixes.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { ConfigManager } from '../config/index.js';

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string[];
}

export interface HealthReport {
  overall: 'healthy' | 'degraded' | 'critical';
  checks: HealthCheck[];
  summary: string;
}

export class HealthChecker {
  private checks: HealthCheck[] = [];

  async runAll(): Promise<HealthReport> {
    this.checks = [];

    await this.checkNodeVersion();
    await this.checkMcpConfig();
    await this.checkDistBuild();
    await this.checkProjectConfig();
    await this.checkAuth();
    await this.checkPlaywright();
    await this.checkNetworkConnectivity();

    return this.generateReport();
  }

  private async checkNodeVersion(): Promise<void> {
    try {
      const version = process.version;
      const major = parseInt(version.slice(1).split('.')[0]);

      if (major >= 18) {
        this.checks.push({
          name: 'node_version',
          status: 'pass',
          message: `Node.js ${version} (>= 18 required)`,
        });
      } else {
        this.checks.push({
          name: 'node_version',
          status: 'fail',
          message: `Node.js ${version} is too old (18+ required)`,
          fix: [
            'Install Node.js 18 or later from https://nodejs.org',
            'Run: node --version to verify',
          ],
        });
      }
    } catch (err) {
      this.checks.push({
        name: 'node_version',
        status: 'fail',
        message: 'Could not detect Node.js version',
        fix: ['Ensure Node.js is installed and in PATH'],
      });
    }
  }

  private async checkMcpConfig(): Promise<void> {
    const homeDir = os.homedir();
    const mcpConfigPath = path.join(homeDir, '.claude', 'mcp.json');

    if (!fs.existsSync(mcpConfigPath)) {
      this.checks.push({
        name: 'mcp_config_exists',
        status: 'fail',
        message: 'MCP config not found',
        fix: [
          'Run the setup script: ./setup.sh (or setup.ps1 on Windows)',
          `Or manually create ${mcpConfigPath}`,
        ],
      });
      return;
    }

    try {
      const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));

      if (!config.mcpServers || !config.mcpServers.msw) {
        this.checks.push({
          name: 'mcp_msw_entry',
          status: 'fail',
          message: 'MSW not configured in mcp.json',
          fix: [
            'Run the setup script to add MSW configuration',
            'Or manually add "msw" entry to mcpServers',
          ],
        });
        return;
      }

      const mswEntry = config.mcpServers.msw;
      const indexPath = mswEntry.args?.[0];

      if (!indexPath || !fs.existsSync(indexPath)) {
        this.checks.push({
          name: 'mcp_msw_path',
          status: 'fail',
          message: `MSW entry point not found: ${indexPath}`,
          fix: [
            'Run: npm run build',
            'Verify path in mcp.json is absolute',
            'See TROUBLESHOOTING.md for details',
          ],
        });
        return;
      }

      this.checks.push({
        name: 'mcp_config',
        status: 'pass',
        message: 'MCP config valid',
      });

    } catch (err) {
      this.checks.push({
        name: 'mcp_config_syntax',
        status: 'fail',
        message: 'MCP config has syntax errors',
        fix: [
          'Validate JSON at jsonlint.com',
          'Check for trailing commas, missing quotes',
          'Restore from backup or run setup script',
        ],
      });
    }
  }

  private async checkDistBuild(): Promise<void> {
    const distPath = path.join(process.cwd(), 'dist', 'mcp', 'index.js');

    if (!fs.existsSync(distPath)) {
      this.checks.push({
        name: 'dist_build',
        status: 'fail',
        message: 'TypeScript build not found',
        fix: [
          'Run: npm install',
          'Run: npm run build',
          'Check for build errors',
        ],
      });
      return;
    }

    // Check if dist is newer than src (stale build detection)
    const srcPath = path.join(process.cwd(), 'src', 'mcp', 'index.ts');
    if (fs.existsSync(srcPath)) {
      const distMtime = fs.statSync(distPath).mtime.getTime();
      const srcMtime = fs.statSync(srcPath).mtime.getTime();

      if (srcMtime > distMtime) {
        this.checks.push({
          name: 'dist_build',
          status: 'warn',
          message: 'Build is stale (src modified after build)',
          fix: ['Run: npm run build'],
        });
        return;
      }
    }

    this.checks.push({
      name: 'dist_build',
      status: 'pass',
      message: 'Build up to date',
    });
  }

  private async checkProjectConfig(): Promise<void> {
    const configManager = new ConfigManager();

    if (!configManager.configExists()) {
      this.checks.push({
        name: 'project_config',
        status: 'warn',
        message: 'No .msw/config.json found (using defaults)',
        fix: [
          'Run: msw_init to create config',
          'Or manually create .msw/config.json',
        ],
      });
      return;
    }

    const { config, validation } = configManager.loadConfig();

    if (!validation.valid) {
      this.checks.push({
        name: 'project_config',
        status: 'fail',
        message: `Config validation failed: ${validation.errors.join(', ')}`,
        fix: [
          'Fix config.json errors',
          'Or delete .msw/config.json and run msw_init',
          'See SETUP.md for config schema',
        ],
      });
      return;
    }

    if (validation.warnings.length > 0) {
      this.checks.push({
        name: 'project_config',
        status: 'warn',
        message: `Config loaded with warnings: ${validation.warnings.join(', ')}`,
        fix: validation.migrated ? ['Config was auto-migrated - review changes'] : [],
      });
      return;
    }

    this.checks.push({
      name: 'project_config',
      status: 'pass',
      message: `Config valid (v${config.version})`,
    });
  }

  private async checkAuth(): Promise<void> {
    const profilePath = path.join(os.homedir(), '.msw', 'chrome_profile', '.authenticated');

    if (!fs.existsSync(profilePath)) {
      this.checks.push({
        name: 'authentication',
        status: 'warn',
        message: 'Not authenticated with Google',
        fix: [
          'Run: msw_init in Claude Code',
          'Complete Google login in browser window',
          'See SETUP.md for detailed instructions',
        ],
      });
      return;
    }

    try {
      const authData = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
      const validatedAt = new Date(authData.validatedAt);
      const daysSince = (Date.now() - validatedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince > 30) {
        this.checks.push({
          name: 'authentication',
          status: 'warn',
          message: `Auth last validated ${Math.floor(daysSince)} days ago`,
          fix: ['Consider re-authenticating: msw_init'],
        });
      } else {
        this.checks.push({
          name: 'authentication',
          status: 'pass',
          message: `Authenticated (verified ${Math.floor(daysSince)} days ago)`,
        });
      }
    } catch {
      this.checks.push({
        name: 'authentication',
        status: 'warn',
        message: 'Auth marker corrupted',
        fix: ['Re-authenticate: msw_init'],
      });
    }
  }

  private async checkPlaywright(): Promise<void> {
    try {
      // Check if Playwright browsers are installed
      const playwrightPath = path.join(process.cwd(), 'node_modules', 'playwright');

      if (!fs.existsSync(playwrightPath)) {
        this.checks.push({
          name: 'playwright',
          status: 'fail',
          message: 'Playwright not installed',
          fix: [
            'Run: npm install',
            'If issues persist: npx playwright install chromium',
          ],
        });
        return;
      }

      // Try to detect browser installation
      const cacheDir = path.join(os.homedir(), '.cache', 'ms-playwright');
      if (!fs.existsSync(cacheDir)) {
        this.checks.push({
          name: 'playwright',
          status: 'warn',
          message: 'Playwright browsers not installed',
          fix: [
            'Run: npx playwright install chromium',
            'This downloads Chromium for browser automation',
          ],
        });
        return;
      }

      this.checks.push({
        name: 'playwright',
        status: 'pass',
        message: 'Playwright ready',
      });

    } catch (err) {
      this.checks.push({
        name: 'playwright',
        status: 'warn',
        message: 'Could not verify Playwright status',
      });
    }
  }

  private async checkNetworkConnectivity(): Promise<void> {
    try {
      // Simple DNS check for Google
      const { execSync } = await import('node:child_process');
      execSync('ping -n 1 google.com', { timeout: 5000, stdio: 'ignore' });

      this.checks.push({
        name: 'network',
        status: 'pass',
        message: 'Network connectivity OK',
      });
    } catch {
      this.checks.push({
        name: 'network',
        status: 'warn',
        message: 'Network connectivity issues detected',
        fix: [
          'Check internet connection',
          'Verify firewall/proxy settings',
          'NotebookLM requires internet access',
        ],
      });
    }
  }

  private generateReport(): HealthReport {
    const failCount = this.checks.filter(c => c.status === 'fail').length;
    const warnCount = this.checks.filter(c => c.status === 'warn').length;

    let overall: 'healthy' | 'degraded' | 'critical';
    let summary: string;

    if (failCount > 0) {
      overall = 'critical';
      summary = `${failCount} critical issue(s) found. MSW may not work properly.`;
    } else if (warnCount > 0) {
      overall = 'degraded';
      summary = `${warnCount} warning(s). MSW should work but some features may be limited.`;
    } else {
      overall = 'healthy';
      summary = 'All checks passed. MSW is ready to use.';
    }

    return {
      overall,
      checks: this.checks,
      summary,
    };
  }
}
