/**
 * Authenticator - Handles Google OAuth and NotebookLM authentication
 *
 * This module manages the complete authentication lifecycle:
 * 1. First-time login (visible browser)
 * 2. Profile persistence
 * 3. Auth validation
 * 4. Error recovery
 */

import type { Page, BrowserContext } from 'playwright';
import { BrowserDriver } from '../browser/driver.js';
import { ProfileManager } from '../browser/profile.js';
import { BackupManager } from '../backup/index.js';
import { globalDegradation } from '../common/degradation.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface AuthConfig {
  profileDir?: string;
  headless?: boolean;
  timeout?: number;
  validateAuth?: boolean;
  maxRetries?: number;
  backupBeforeAuth?: boolean;
}

export interface AuthResult {
  success: boolean;
  authenticated: boolean;
  profilePath: string;
  error?: string;
  validatedAt?: string;
}

const NOTEBOOKLM_URL = 'https://notebooklm.google.com';
const DEFAULT_PROFILE_DIR = path.join(os.homedir(), '.msw', 'chrome_profile');
const AUTH_TIMEOUT = 120000; // 2 minutes for manual login

export class Authenticator {
  private driver: BrowserDriver | null = null;
  private config: Required<AuthConfig>;
  private backupManager: BackupManager;

  constructor(config?: AuthConfig) {
    this.config = {
      profileDir: config?.profileDir ?? DEFAULT_PROFILE_DIR,
      headless: config?.headless ?? false, // Default visible for auth
      timeout: config?.timeout ?? AUTH_TIMEOUT,
      validateAuth: config?.validateAuth ?? true,
      maxRetries: config?.maxRetries ?? 3,
      backupBeforeAuth: config?.backupBeforeAuth ?? true,
    };
    this.backupManager = new BackupManager();
  }

  /**
   * Authenticate with Google and NotebookLM with retry logic.
   * Opens browser for manual login if not already authenticated.
   */
  async authenticate(): Promise<AuthResult> {
    // Backup before authentication if enabled
    if (this.config.backupBeforeAuth) {
      try {
        await this.backupManager.createBackup('before-authentication');
        console.log('[auth] Created backup before authentication');
      } catch (err) {
        console.warn('[auth] Backup failed, continuing anyway:', err);
      }
    }

    // Retry logic with exponential backoff
    let lastError: string | undefined;
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`[auth] Authentication attempt ${attempt}/${this.config.maxRetries}`);

        const result = await this.authenticateOnce();

        if (result.success) {
          return result;
        }

        lastError = result.error;

        // Don't retry if user explicitly cancelled
        if (result.error?.includes('cancelled') || result.error?.includes('timeout')) {
          break;
        }

        // Exponential backoff (2s, 4s, 8s)
        if (attempt < this.config.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`[auth] Retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error(`[auth] Attempt ${attempt} failed:`, lastError);
      }
    }

    return {
      success: false,
      authenticated: false,
      profilePath: this.config.profileDir,
      error: `Authentication failed after ${this.config.maxRetries} attempts. Last error: ${lastError}`,
    };
  }

  /**
   * Single authentication attempt (internal)
   */
  private async authenticateOnce(): Promise<AuthResult> {
    try {
      // Check if already authenticated
      if (await this.isAuthenticated()) {
        return {
          success: true,
          authenticated: true,
          profilePath: this.config.profileDir,
          validatedAt: new Date().toISOString(),
        };
      }

      // Launch browser with fallback to visible mode
      const { result: browserContext, context: degradationContext } = await globalDegradation.withFallbacks(
        'browser-launch',
        [
          {
            name: this.config.headless ? 'headless-mode' : 'visible-mode',
            fn: async () => {
              this.driver = new BrowserDriver({
                profileDir: this.config.profileDir,
                headless: this.config.headless,
                viewport: { width: 1280, height: 720 },
              });
              return await this.driver.launch();
            },
          },
          ...(this.config.headless ? [{
            name: 'fallback-visible-mode',
            fn: async () => {
              console.log('[auth] Headless mode failed, falling back to visible browser');
              this.driver = new BrowserDriver({
                profileDir: this.config.profileDir,
                headless: false,
                viewport: { width: 1280, height: 720 },
              });
              return await this.driver.launch();
            },
          }] : []),
        ],
      );

      if (!browserContext) {
        throw new Error(`Browser launch failed: ${degradationContext.userMessage}`);
      }

      console.log(`[auth] ${degradationContext.userMessage}`);
      const page = await this.driver!.getPage();

      // Navigate to NotebookLM
      console.log('[auth] Opening NotebookLM for authentication...');
      await page.goto(NOTEBOOKLM_URL, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout
      });

      // Wait for user to complete Google login
      console.log('[auth] Waiting for Google login...');
      await this.waitForAuth(page);

      // Validate authentication worked
      if (this.config.validateAuth) {
        const validated = await this.validateAuthentication(page);
        if (!validated) {
          await this.driver!.close();
          return {
            success: false,
            authenticated: false,
            profilePath: this.config.profileDir,
            error: 'Authentication validation failed. Please ensure you completed Google login.',
          };
        }
      }

      // Save auth state
      await this.saveAuthState();

      // Close browser
      await this.driver!.close();

      return {
        success: true,
        authenticated: true,
        profilePath: this.config.profileDir,
        validatedAt: new Date().toISOString(),
      };

    } catch (err) {
      if (this.driver) {
        await this.driver.close();
      }

      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        authenticated: false,
        profilePath: this.config.profileDir,
        error: `Authentication failed: ${message}`,
      };
    }
  }

  /**
   * Check if user is already authenticated by looking for auth markers.
   */
  async isAuthenticated(): Promise<boolean> {
    const authMarkerPath = path.join(this.config.profileDir, '.authenticated');

    if (!fs.existsSync(authMarkerPath)) {
      return false;
    }

    try {
      const authData = JSON.parse(fs.readFileSync(authMarkerPath, 'utf-8'));
      const validatedAt = new Date(authData.validatedAt);
      const now = new Date();
      const daysSinceValidation = (now.getTime() - validatedAt.getTime()) / (1000 * 60 * 60 * 24);

      // Revalidate if more than 7 days old
      if (daysSinceValidation > 7) {
        console.log('[auth] Auth marker expired, needs revalidation');
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for authentication to complete by detecting NotebookLM UI elements.
   */
  private async waitForAuth(page: Page): Promise<void> {
    const timeout = this.config.timeout;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      // Check for NotebookLM authenticated UI
      const url = page.url();

      // If we're on a notebook page or the main NotebookLM page (not login), we're authenticated
      if (url.includes('notebooklm.google.com/notebook') ||
          (url.includes('notebooklm.google.com') && !url.includes('/auth'))) {

        // Additional check: look for NotebookLM UI elements
        const notebookElement = await page.$('[data-testid="notebook"]').catch(() => null);
        const createButton = await page.$('button:has-text("Create")').catch(() => null);

        if (notebookElement || createButton) {
          console.log('[auth] Detected NotebookLM authenticated state');
          return;
        }
      }

      // Wait a bit before checking again
      await page.waitForTimeout(1000);
    }

    throw new Error('Authentication timeout - user did not complete Google login');
  }

  /**
   * Validate that authentication actually worked by checking cookies and page state.
   */
  private async validateAuthentication(page: Page): Promise<boolean> {
    try {
      // Check for Google auth cookies
      const cookies = await page.context().cookies();
      const hasGoogleAuth = cookies.some(c =>
        c.domain.includes('google.com') &&
        (c.name.includes('SID') || c.name.includes('SSID'))
      );

      if (!hasGoogleAuth) {
        console.log('[auth] Missing Google auth cookies');
        return false;
      }

      // Check page URL is NotebookLM (not login page)
      const url = page.url();
      if (url.includes('/auth') || url.includes('/login')) {
        console.log('[auth] Still on login page');
        return false;
      }

      console.log('[auth] Authentication validated successfully');
      return true;

    } catch (err) {
      console.error('[auth] Validation error:', err);
      return false;
    }
  }

  /**
   * Save authentication state marker for future checks.
   */
  private async saveAuthState(): Promise<void> {
    const authMarkerPath = path.join(this.config.profileDir, '.authenticated');
    const authData = {
      validatedAt: new Date().toISOString(),
      version: '1.0',
    };

    fs.mkdirSync(path.dirname(authMarkerPath), { recursive: true });
    fs.writeFileSync(authMarkerPath, JSON.stringify(authData, null, 2));
  }

  /**
   * Clear authentication state (for logout or reset).
   */
  async clearAuth(): Promise<void> {
    const authMarkerPath = path.join(this.config.profileDir, '.authenticated');
    if (fs.existsSync(authMarkerPath)) {
      fs.unlinkSync(authMarkerPath);
    }
  }

  /**
   * Get authentication status without opening browser.
   */
  async getStatus(): Promise<{ authenticated: boolean; profilePath: string; validatedAt?: string }> {
    const authMarkerPath = path.join(this.config.profileDir, '.authenticated');

    if (!fs.existsSync(authMarkerPath)) {
      return {
        authenticated: false,
        profilePath: this.config.profileDir,
      };
    }

    try {
      const authData = JSON.parse(fs.readFileSync(authMarkerPath, 'utf-8'));
      return {
        authenticated: true,
        profilePath: this.config.profileDir,
        validatedAt: authData.validatedAt,
      };
    } catch {
      return {
        authenticated: false,
        profilePath: this.config.profileDir,
      };
    }
  }
}
