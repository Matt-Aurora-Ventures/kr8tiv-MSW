import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

/**
 * Manages a dedicated Chrome profile directory for persistent authentication.
 * Ensures only one MSW instance uses the profile at a time via PID-based lock files.
 */
export class ProfileManager {
  readonly profileDir: string;
  private readonly lockPath: string;
  private lockAcquired = false;
  private exitHandler: (() => void) | null = null;

  constructor(profileDir?: string) {
    this.profileDir = profileDir ?? path.join(os.homedir(), ".msw", "chrome-profile");
    this.lockPath = path.join(this.profileDir, ".lock");
  }

  /** Creates the profile directory if it does not exist. Returns the path. */
  ensureProfileDir(): string {
    fs.mkdirSync(this.profileDir, { recursive: true });
    return this.profileDir;
  }

  /** Acquires an exclusive lock. Throws if another live process holds the lock. */
  acquireLock(): void {
    this.ensureProfileDir();

    if (fs.existsSync(this.lockPath)) {
      const raw = fs.readFileSync(this.lockPath, "utf-8").trim();
      const pid = parseInt(raw, 10);

      if (!isNaN(pid) && this.isProcessRunning(pid) && pid !== process.pid) {
        throw new Error(
          `Another MSW instance is using this profile (PID: ${pid}). Close it first.`
        );
      }
      // Stale lock - remove it
      fs.unlinkSync(this.lockPath);
    }

    fs.writeFileSync(this.lockPath, String(process.pid), "utf-8");
    this.lockAcquired = true;

    this.exitHandler = () => this.releaseLock();
    process.on("exit", this.exitHandler);
    process.on("SIGINT", () => {
      this.releaseLock();
      process.exit(130);
    });
  }

  /** Releases the lock if this process owns it. */
  releaseLock(): void {
    if (!this.lockAcquired) return;

    try {
      if (fs.existsSync(this.lockPath)) {
        const raw = fs.readFileSync(this.lockPath, "utf-8").trim();
        const pid = parseInt(raw, 10);
        if (pid === process.pid) {
          fs.unlinkSync(this.lockPath);
        }
      }
    } catch {
      // Best-effort cleanup during shutdown
    }

    this.lockAcquired = false;
    if (this.exitHandler) {
      process.removeListener("exit", this.exitHandler);
      this.exitHandler = null;
    }
  }

  /** Returns true if a valid (non-stale) lock exists from another process. */
  isLocked(): boolean {
    if (!fs.existsSync(this.lockPath)) return false;

    const raw = fs.readFileSync(this.lockPath, "utf-8").trim();
    const pid = parseInt(raw, 10);
    if (isNaN(pid)) return false;
    if (pid === process.pid) return false;

    return this.isProcessRunning(pid);
  }

  /** Ensures directory exists, acquires lock, and returns the profile path. */
  getProfileDir(): string {
    this.ensureProfileDir();
    this.acquireLock();
    return this.profileDir;
  }

  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
}
