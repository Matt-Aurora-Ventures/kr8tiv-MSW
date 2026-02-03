/**
 * Backup Manager - Handles config, state, and profile backups
 *
 * Features:
 * - Automatic backups before risky operations
 * - Chrome profile snapshots
 * - Config versioning
 * - One-click restore
 * - Cleanup of old backups
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';

export interface BackupMetadata {
  timestamp: string;
  reason: string;
  version: string;
  files: string[];
}

export interface RestoreResult {
  success: boolean;
  restored: string[];
  failed: string[];
  error?: string;
}

const BACKUP_DIR = path.join(os.homedir(), '.msw', 'backups');
const MAX_BACKUPS = 10; // Keep last 10 backups

export class BackupManager {
  private backupDir: string;

  constructor(backupDir?: string) {
    this.backupDir = backupDir ?? BACKUP_DIR;
    this.ensureBackupDir();
  }

  /**
   * Create a full backup of MSW state
   */
  async createBackup(reason: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupId);

    fs.mkdirSync(backupPath, { recursive: true });

    const files: string[] = [];

    try {
      // Backup Chrome profile (if exists)
      const profilePath = path.join(os.homedir(), '.msw', 'chrome_profile');
      if (fs.existsSync(profilePath)) {
        const profileBackup = path.join(backupPath, 'chrome_profile');
        this.copyRecursive(profilePath, profileBackup);
        files.push('chrome_profile');
      }

      // Backup auth marker
      const authMarker = path.join(os.homedir(), '.msw', 'chrome_profile', '.authenticated');
      if (fs.existsSync(authMarker)) {
        const authBackup = path.join(backupPath, 'authenticated.json');
        fs.copyFileSync(authMarker, authBackup);
        files.push('authenticated.json');
      }

      // Backup .msw config from project (if in project context)
      const projectMswPath = path.join(process.cwd(), '.msw', 'config.json');
      if (fs.existsSync(projectMswPath)) {
        const configBackup = path.join(backupPath, 'config.json');
        fs.copyFileSync(projectMswPath, configBackup);
        files.push('config.json');
      }

      // Create metadata
      const metadata: BackupMetadata = {
        timestamp,
        reason,
        version: '1.0.0', // MSW version
        files,
      };

      fs.writeFileSync(
        path.join(backupPath, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );

      // Cleanup old backups
      this.cleanupOldBackups();

      console.log(`[backup] Created backup: ${backupId}`);
      return backupId;

    } catch (err) {
      // Cleanup failed backup
      if (fs.existsSync(backupPath)) {
        fs.rmSync(backupPath, { recursive: true, force: true });
      }
      throw new Error(`Backup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Restore from a specific backup
   */
  async restore(backupId: string): Promise<RestoreResult> {
    const backupPath = path.join(this.backupDir, backupId);

    if (!fs.existsSync(backupPath)) {
      return {
        success: false,
        restored: [],
        failed: [],
        error: `Backup not found: ${backupId}`,
      };
    }

    const restored: string[] = [];
    const failed: string[] = [];
    let metadata: BackupMetadata | undefined;

    try {
      metadata = JSON.parse(
        fs.readFileSync(path.join(backupPath, 'metadata.json'), 'utf-8')
      ) as BackupMetadata;

      if (!metadata || !metadata.files) {
        throw new Error('Invalid metadata');
      }

      // Restore Chrome profile
      if (metadata.files.includes('chrome_profile')) {
        try {
          const profileBackup = path.join(backupPath, 'chrome_profile');
          const profilePath = path.join(os.homedir(), '.msw', 'chrome_profile');

          // Backup current before overwriting
          if (fs.existsSync(profilePath)) {
            await this.createBackup('before-restore');
          }

          this.copyRecursive(profileBackup, profilePath);
          restored.push('chrome_profile');
        } catch (err) {
          failed.push('chrome_profile');
        }
      }

      // Restore auth marker
      if (metadata.files.includes('authenticated.json')) {
        try {
          const authBackup = path.join(backupPath, 'authenticated.json');
          const authPath = path.join(os.homedir(), '.msw', 'chrome_profile', '.authenticated');

          fs.mkdirSync(path.dirname(authPath), { recursive: true });
          fs.copyFileSync(authBackup, authPath);
          restored.push('authenticated.json');
        } catch (err) {
          failed.push('authenticated.json');
        }
      }

      // Restore config
      if (metadata.files.includes('config.json')) {
        try {
          const configBackup = path.join(backupPath, 'config.json');
          const configPath = path.join(process.cwd(), '.msw', 'config.json');

          fs.mkdirSync(path.dirname(configPath), { recursive: true });
          fs.copyFileSync(configBackup, configPath);
          restored.push('config.json');
        } catch (err) {
          failed.push('config.json');
        }
      }

      console.log(`[backup] Restored from: ${backupId}`);
      return {
        success: failed.length === 0,
        restored,
        failed,
      };

    } catch (err) {
      return {
        success: false,
        restored,
        failed: metadata?.files ?? [],
        error: `Restore failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * List all available backups
   */
  listBackups(): BackupMetadata[] {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }

    const backups: BackupMetadata[] = [];

    for (const entry of fs.readdirSync(this.backupDir)) {
      const metadataPath = path.join(this.backupDir, entry, 'metadata.json');
      if (fs.existsSync(metadataPath)) {
        try {
          const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
          backups.push(metadata);
        } catch {
          // Skip invalid metadata
        }
      }
    }

    // Sort by timestamp (newest first)
    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  /**
   * Delete a specific backup
   */
  deleteBackup(backupId: string): boolean {
    const backupPath = path.join(this.backupDir, backupId);

    if (!fs.existsSync(backupPath)) {
      return false;
    }

    try {
      fs.rmSync(backupPath, { recursive: true, force: true });
      console.log(`[backup] Deleted backup: ${backupId}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get latest backup
   */
  getLatestBackup(): BackupMetadata | null {
    const backups = this.listBackups();
    return backups.length > 0 ? backups[0] : null;
  }

  /**
   * Cleanup old backups (keep only MAX_BACKUPS)
   */
  private cleanupOldBackups(): void {
    const backups = this.listBackups();

    if (backups.length <= MAX_BACKUPS) {
      return;
    }

    // Delete oldest backups
    const toDelete = backups.slice(MAX_BACKUPS);
    for (const backup of toDelete) {
      const backupId = `backup-${backup.timestamp}`;
      this.deleteBackup(backupId);
    }
  }

  /**
   * Ensure backup directory exists
   */
  private ensureBackupDir(): void {
    fs.mkdirSync(this.backupDir, { recursive: true });
  }

  /**
   * Copy directory recursively
   */
  private copyRecursive(src: string, dest: string): void {
    if (!fs.existsSync(src)) {
      return;
    }

    if (fs.statSync(src).isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });

      for (const entry of fs.readdirSync(src)) {
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        this.copyRecursive(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  /**
   * Calculate backup size
   */
  getBackupSize(backupId: string): number {
    const backupPath = path.join(this.backupDir, backupId);

    if (!fs.existsSync(backupPath)) {
      return 0;
    }

    let size = 0;

    const calculateSize = (dirPath: string): void => {
      for (const entry of fs.readdirSync(dirPath)) {
        const fullPath = path.join(dirPath, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          calculateSize(fullPath);
        } else {
          size += stat.size;
        }
      }
    };

    calculateSize(backupPath);
    return size;
  }

  /**
   * Export backup to external location
   */
  exportBackup(backupId: string, exportPath: string): boolean {
    const backupPath = path.join(this.backupDir, backupId);

    if (!fs.existsSync(backupPath)) {
      return false;
    }

    try {
      this.copyRecursive(backupPath, exportPath);
      console.log(`[backup] Exported to: ${exportPath}`);
      return true;
    } catch (err) {
      console.error(`[backup] Export failed:`, err);
      return false;
    }
  }
}
