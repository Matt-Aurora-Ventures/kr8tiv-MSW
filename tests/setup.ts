/**
 * Test setup utilities
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

/**
 * Create a temporary test directory
 */
export function createTestDir(prefix: string): string {
  const testDir = path.join(os.tmpdir(), `${prefix}-${Date.now()}`);
  fs.mkdirSync(testDir, { recursive: true });
  return testDir;
}

/**
 * Clean up a test directory
 */
export function cleanupTestDir(testDir: string): void {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}
