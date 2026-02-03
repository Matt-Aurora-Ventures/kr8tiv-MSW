import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Authenticator } from "../../src/auth/authenticator.js";
import { BackupManager } from "../../src/backup/manager.js";
import { createTestDir, cleanupTestDir } from "../setup.js";
import fs from "node:fs";
import path from "node:path";

describe("Auth flow integration", () => {
  let testDir: string;
  let profileDir: string;

  beforeEach(() => {
    testDir = createTestDir("auth-flow-test");
    profileDir = path.join(testDir, "chrome_profile");
    fs.mkdirSync(profileDir, { recursive: true });
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  it("persists auth state across Authenticator instances", async () => {
    // 1. Simulate login - create auth marker (represents successful auth)
    const authenticator1 = new Authenticator({
      profileDir,
      headless: true,
      validateAuth: false,
      backupBeforeAuth: false,
    });

    const authMarkerPath = path.join(profileDir, ".authenticated");
    const authData = {
      validatedAt: new Date().toISOString(),
      version: "1.0",
    };
    fs.writeFileSync(authMarkerPath, JSON.stringify(authData));

    // Verify authenticated
    const isAuthenticated = await authenticator1.isAuthenticated();
    expect(isAuthenticated).toBe(true);

    const status1 = await authenticator1.getStatus();
    expect(status1.authenticated).toBe(true);
    expect(status1.validatedAt).toBeDefined();

    // 2. Create backup manager for this test
    const backup = new BackupManager(testDir);
    const backupId = await backup.createBackup("auth-state-backup");

    // Verify backup was created
    expect(fs.existsSync(path.join(testDir, backupId))).toBe(true);

    const backupMetadata = backup.getLatestBackup();
    expect(backupMetadata).not.toBeNull();
    expect(backupMetadata?.reason).toBe("auth-state-backup");

    // 3. Simulate crash - clear auth state
    await authenticator1.clearAuth();
    expect(await authenticator1.isAuthenticated()).toBe(false);

    // 4. Manually restore auth marker (simulating recovery)
    fs.writeFileSync(authMarkerPath, JSON.stringify(authData));

    // 5. Validate restored session works with new Authenticator instance
    const authenticator2 = new Authenticator({
      profileDir,
      headless: true,
      validateAuth: false,
      backupBeforeAuth: false,
    });

    const isRestoredAuth = await authenticator2.isAuthenticated();
    expect(isRestoredAuth).toBe(true);

    const status2 = await authenticator2.getStatus();
    expect(status2.authenticated).toBe(true);
    expect(status2.validatedAt).toBe(status1.validatedAt);
  });

  it("handles session expiry correctly", async () => {
    // Create expired auth marker (8 days old)
    const authMarkerPath = path.join(profileDir, ".authenticated");
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

    const expiredAuthData = {
      validatedAt: eightDaysAgo.toISOString(),
      version: "1.0",
    };
    fs.writeFileSync(authMarkerPath, JSON.stringify(expiredAuthData));

    // Create backup of expired state
    const backup = new BackupManager(testDir);
    const backupId = await backup.createBackup("expired-auth-backup");
    expect(backupId).toBeDefined();

    // Verify expired auth is detected
    const authenticator = new Authenticator({
      profileDir,
      headless: true,
      validateAuth: false,
      backupBeforeAuth: false,
    });

    const isAuthenticated = await authenticator.isAuthenticated();
    expect(isAuthenticated).toBe(false); // Expired (> 7 days)

    const status = await authenticator.getStatus();
    // Status reads the file directly, doesn't check expiry
    expect(status.validatedAt).toBe(eightDaysAgo.toISOString());

    // After clearing, can verify re-authentication needed
    await authenticator.clearAuth();
    expect(await authenticator.isAuthenticated()).toBe(false);
  });

  it("detects logout between operations", async () => {
    const authenticator = new Authenticator({
      profileDir,
      headless: true,
      validateAuth: false,
      backupBeforeAuth: false,
    });

    // First state - authenticated
    const authMarkerPath = path.join(profileDir, ".authenticated");
    const authData = {
      validatedAt: new Date().toISOString(),
      version: "1.0",
    };
    fs.writeFileSync(authMarkerPath, JSON.stringify(authData));

    expect(await authenticator.isAuthenticated()).toBe(true);

    const backup = new BackupManager(testDir);
    const backup1Id = await backup.createBackup("authenticated-state");

    const backup1Files = backup.listBackups()[0].files;
    expect(backup1Files).toBeDefined();

    // Simulate logout - clear auth marker
    await authenticator.clearAuth();
    expect(await authenticator.isAuthenticated()).toBe(false);

    // New backup after logout
    const backup2Id = await backup.createBackup("logged-out-state");
    expect(backup2Id).toBeDefined();

    // Manually restore auth marker (simulating session recovery)
    fs.writeFileSync(authMarkerPath, JSON.stringify(authData));
    expect(await authenticator.isAuthenticated()).toBe(true);

    // Clear and verify logged out
    await authenticator.clearAuth();
    expect(await authenticator.isAuthenticated()).toBe(false);

    // Restore manually again
    fs.writeFileSync(authMarkerPath, JSON.stringify(authData));
    expect(await authenticator.isAuthenticated()).toBe(true);
  });

  it("handles concurrent auth checks and backups", async () => {
    const profileDir = path.join(testDir, "chrome_profile");
    fs.mkdirSync(profileDir, { recursive: true });

    const authenticator = new Authenticator({
      profileDir,
      headless: true,
      validateAuth: false,
      backupBeforeAuth: false,
    });

    // Create auth marker
    const authMarkerPath = path.join(profileDir, ".authenticated");
    fs.writeFileSync(
      authMarkerPath,
      JSON.stringify({
        validatedAt: new Date().toISOString(),
        version: "1.0",
      })
    );

    const backup = new BackupManager(testDir);

    // Perform multiple auth checks and backups concurrently
    const operations = Promise.all([
      authenticator.isAuthenticated(),
      authenticator.getStatus(),
      backup.createBackup("concurrent-backup-1"),
      authenticator.isAuthenticated(),
      backup.createBackup("concurrent-backup-2"),
    ]);

    await expect(operations).resolves.toBeDefined();

    // Verify all operations succeeded
    expect(await authenticator.isAuthenticated()).toBe(true);

    const backups = backup.listBackups();
    expect(backups.length).toBeGreaterThanOrEqual(2);
  });
});
