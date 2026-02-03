import { beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Global test timeout extension for E2E tests
beforeAll(() => {
  // Ensure temp directories are clean
  const staleTests = fs.readdirSync(os.tmpdir()).filter((dir) =>
    dir.startsWith("msw-test-") || dir.startsWith("msw-e2e-")
  );

  // Clean up stale test directories older than 1 hour
  const oneHourAgo = Date.now() - 3600_000;
  staleTests.forEach((dir) => {
    const fullPath = path.join(os.tmpdir(), dir);
    try {
      const stats = fs.statSync(fullPath);
      if (stats.mtime.getTime() < oneHourAgo) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    } catch (e) {
      // Ignore errors (directory may be in use)
    }
  });
});

afterAll(() => {
  // Global cleanup runs after all tests
});

/**
 * Create a unique temporary directory for a test
 */
export function createTestDir(prefix = "msw-test"): string {
  return fs.mkdtempSync(
    path.join(os.tmpdir(), `${prefix}-${Date.now()}-`)
  );
}

/**
 * Clean up a test directory
 */
export function cleanupTestDir(dir: string): void {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
