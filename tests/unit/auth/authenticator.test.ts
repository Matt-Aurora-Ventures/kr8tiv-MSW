// vitest globals enabled - no import needed
import { Authenticator } from "../../../src/auth/authenticator.js";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("Authenticator", () => {
  let testProfileDir: string;
  let authenticator: Authenticator;

  beforeEach(() => {
    // Create temporary test profile directory
    testProfileDir = path.join(os.tmpdir(), `msw-test-${Date.now()}`);
    fs.mkdirSync(testProfileDir, { recursive: true });

    authenticator = new Authenticator({
      profileDir: testProfileDir,
      headless: true,
      validateAuth: false, // Disable validation for unit tests
      backupBeforeAuth: false, // Disable backup for unit tests
    });
  });

  afterEach(() => {
    // Cleanup test directory
    if (fs.existsSync(testProfileDir)) {
      fs.rmSync(testProfileDir, { recursive: true, force: true });
    }
  });

  describe("isAuthenticated", () => {
    it("returns false when no auth marker exists", async () => {
      const result = await authenticator.isAuthenticated();
      expect(result).toBe(false);
    });

    it("returns true with valid recent auth marker", async () => {
      // Create auth marker file
      const authMarkerPath = path.join(testProfileDir, ".authenticated");
      const authData = {
        validatedAt: new Date().toISOString(),
        version: "1.0",
      };
      fs.writeFileSync(authMarkerPath, JSON.stringify(authData));

      const result = await authenticator.isAuthenticated();
      expect(result).toBe(true);
    });

    it("returns false with expired auth marker (> 7 days)", async () => {
      // Create expired auth marker (8 days old)
      const authMarkerPath = path.join(testProfileDir, ".authenticated");
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

      const authData = {
        validatedAt: eightDaysAgo.toISOString(),
        version: "1.0",
      };
      fs.writeFileSync(authMarkerPath, JSON.stringify(authData));

      const result = await authenticator.isAuthenticated();
      expect(result).toBe(false);
    });

    it("returns false with corrupted auth marker", async () => {
      // Create corrupted auth marker file
      const authMarkerPath = path.join(testProfileDir, ".authenticated");
      fs.writeFileSync(authMarkerPath, "not-valid-json{");

      const result = await authenticator.isAuthenticated();
      expect(result).toBe(false);
    });
  });

  describe("getStatus", () => {
    it("returns unauthenticated status when no auth marker", async () => {
      const status = await authenticator.getStatus();

      expect(status.authenticated).toBe(false);
      expect(status.profilePath).toBe(testProfileDir);
      expect(status.validatedAt).toBeUndefined();
    });

    it("returns authenticated status with valid auth marker", async () => {
      // Create auth marker
      const authMarkerPath = path.join(testProfileDir, ".authenticated");
      const now = new Date().toISOString();
      const authData = {
        validatedAt: now,
        version: "1.0",
      };
      fs.writeFileSync(authMarkerPath, JSON.stringify(authData));

      const status = await authenticator.getStatus();

      expect(status.authenticated).toBe(true);
      expect(status.profilePath).toBe(testProfileDir);
      expect(status.validatedAt).toBe(now);
    });

    it("handles corrupted auth marker gracefully", async () => {
      const authMarkerPath = path.join(testProfileDir, ".authenticated");
      fs.writeFileSync(authMarkerPath, "corrupted");

      const status = await authenticator.getStatus();

      expect(status.authenticated).toBe(false);
      expect(status.profilePath).toBe(testProfileDir);
    });
  });

  describe("clearAuth", () => {
    it("removes auth marker file", async () => {
      // Create auth marker
      const authMarkerPath = path.join(testProfileDir, ".authenticated");
      fs.writeFileSync(authMarkerPath, JSON.stringify({ validatedAt: new Date().toISOString() }));

      expect(fs.existsSync(authMarkerPath)).toBe(true);

      await authenticator.clearAuth();

      expect(fs.existsSync(authMarkerPath)).toBe(false);
    });

    it("does not throw if auth marker doesn't exist", async () => {
      await expect(authenticator.clearAuth()).resolves.not.toThrow();
    });
  });

  describe("auth state management", () => {
    it("transitions from unauthenticated to authenticated when marker created", async () => {
      // Initially not authenticated
      expect(await authenticator.isAuthenticated()).toBe(false);

      // Simulate successful authentication by creating marker
      const authMarkerPath = path.join(testProfileDir, ".authenticated");
      const authData = {
        validatedAt: new Date().toISOString(),
        version: "1.0",
      };
      fs.writeFileSync(authMarkerPath, JSON.stringify(authData));

      // Now authenticated
      expect(await authenticator.isAuthenticated()).toBe(true);
    });

    it("transitions from authenticated to unauthenticated on clearAuth", async () => {
      // Setup: create authenticated state
      const authMarkerPath = path.join(testProfileDir, ".authenticated");
      fs.writeFileSync(authMarkerPath, JSON.stringify({
        validatedAt: new Date().toISOString(),
        version: "1.0",
      }));

      expect(await authenticator.isAuthenticated()).toBe(true);

      // Clear auth (simulates logout)
      await authenticator.clearAuth();

      expect(await authenticator.isAuthenticated()).toBe(false);
    });
  });
});
