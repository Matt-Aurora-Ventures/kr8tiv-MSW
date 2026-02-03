#!/usr/bin/env node
/**
 * MSW Protocol Validation Script
 *
 * Runs automated checks to validate Phase 1 implementation.
 * Can be run locally or in CI/CD.
 */

import { HealthChecker } from '../dist/health/index.js';
import { Authenticator } from '../dist/auth/index.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, COLORS.reset);
}

async function main() {
  log(COLORS.cyan, '\n╔════════════════════════════════════════╗');
  log(COLORS.cyan, '║   MSW Protocol Validation Suite       ║');
  log(COLORS.cyan, '╚════════════════════════════════════════╝\n');

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  // Test 1: Health Check Module
  log(COLORS.cyan, '[1/5] Testing Health Check Module...');
  try {
    const checker = new HealthChecker();
    const report = await checker.runAll();

    log(COLORS.cyan, `  Overall Status: ${report.overall}`);
    log(COLORS.cyan, `  Summary: ${report.summary}`);

    for (const check of report.checks) {
      const symbol = check.status === 'pass' ? '✓' :
                     check.status === 'warn' ? '⚠' : '✗';
      const color = check.status === 'pass' ? COLORS.green :
                    check.status === 'warn' ? COLORS.yellow : COLORS.red;

      log(color, `    ${symbol} ${check.name}: ${check.message}`);

      if (check.status === 'fail') failed++;
      else if (check.status === 'warn') warnings++;
      else passed++;
    }

    if (report.overall === 'healthy') {
      log(COLORS.green, '  ✓ Health check passed');
    } else if (report.overall === 'degraded') {
      log(COLORS.yellow, `  ⚠ Health check degraded (${warnings} warnings)`);
    } else {
      log(COLORS.red, `  ✗ Health check failed (${failed} failures)`);
    }

  } catch (err) {
    log(COLORS.red, '  ✗ Health check crashed:', err.message);
    failed++;
  }

  // Test 2: Auth Status Check (No Browser)
  log(COLORS.cyan, '\n[2/5] Testing Auth Status Check...');
  try {
    const authenticator = new Authenticator();
    const status = await authenticator.getStatus();

    log(COLORS.cyan, `  Authenticated: ${status.authenticated}`);
    log(COLORS.cyan, `  Profile Path: ${status.profilePath}`);

    if (status.authenticated) {
      log(COLORS.green, `  ✓ Auth validated at: ${status.validatedAt}`);
      passed++;
    } else {
      log(COLORS.yellow, '  ⚠ Not authenticated (expected for fresh install)');
      warnings++;
    }
  } catch (err) {
    log(COLORS.red, '  ✗ Auth status check failed:', err.message);
    failed++;
  }

  // Test 3: Build Validation
  log(COLORS.cyan, '\n[3/5] Testing Build Artifacts...');
  const requiredFiles = [
    'dist/mcp/index.js',
    'dist/auth/authenticator.js',
    'dist/health/checker.js',
    'dist/mcp/tools/msw-init.js',
    'dist/mcp/tools/msw-status.js',
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      log(COLORS.green, `  ✓ ${file}`);
      passed++;
    } else {
      log(COLORS.red, `  ✗ Missing: ${file}`);
      failed++;
    }
  }

  // Test 4: Documentation
  log(COLORS.cyan, '\n[4/5] Testing Documentation...');
  const requiredDocs = [
    'README.md',
    'SETUP.md',
    'TROUBLESHOOTING.md',
    'setup.sh',
    'setup.ps1',
  ];

  for (const doc of requiredDocs) {
    if (fs.existsSync(doc)) {
      log(COLORS.green, `  ✓ ${doc}`);
      passed++;
    } else {
      log(COLORS.red, `  ✗ Missing: ${doc}`);
      failed++;
    }
  }

  // Test 5: Package Integrity
  log(COLORS.cyan, '\n[5/5] Testing Package Integrity...');
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

    if (packageJson.bin && packageJson.bin['msw-mcp-server']) {
      log(COLORS.green, '  ✓ MCP server bin entry present');
      passed++;
    } else {
      log(COLORS.red, '  ✗ MCP server bin entry missing');
      failed++;
    }

    if (packageJson.dependencies['@modelcontextprotocol/sdk']) {
      log(COLORS.green, '  ✓ MCP SDK dependency present');
      passed++;
    } else {
      log(COLORS.red, '  ✗ MCP SDK dependency missing');
      failed++;
    }

    if (packageJson.dependencies['playwright']) {
      log(COLORS.green, '  ✓ Playwright dependency present');
      passed++;
    } else {
      log(COLORS.red, '  ✗ Playwright dependency missing');
      failed++;
    }

  } catch (err) {
    log(COLORS.red, '  ✗ Package.json validation failed:', err.message);
    failed++;
  }

  // Summary
  log(COLORS.cyan, '\n╔════════════════════════════════════════╗');
  log(COLORS.cyan, '║           Validation Summary           ║');
  log(COLORS.cyan, '╚════════════════════════════════════════╝');
  log(COLORS.green, `  ✓ Passed: ${passed}`);
  log(COLORS.yellow, `  ⚠ Warnings: ${warnings}`);
  log(COLORS.red, `  ✗ Failed: ${failed}\n`);

  if (failed > 0) {
    log(COLORS.red, 'Validation FAILED. Fix errors before deploying.');
    process.exit(1);
  } else if (warnings > 0) {
    log(COLORS.yellow, 'Validation passed with warnings. Review before deploying.');
    process.exit(0);
  } else {
    log(COLORS.green, 'Validation PASSED. MSW is ready!');
    process.exit(0);
  }
}

main().catch(err => {
  log(COLORS.red, 'Validation script crashed:', err);
  process.exit(2);
});
