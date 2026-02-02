/**
 * BrowserDriver -- core browser automation class for MSW Protocol.
 *
 * Launches a persistent Chromium context with stealth evasions applied,
 * suitable for interacting with Google services (NotebookLM) without
 * triggering bot detection.
 */

import * as fs from 'node:fs';
import type { BrowserContext, Page } from 'playwright';
import { configureStealthBrowser } from './stealth.js';
import {
  type BrowserConfig,
  type LaunchOptions,
  DEFAULT_BROWSER_CONFIG,
  DEFAULT_USER_AGENT,
} from '../types/browser.js';

export class BrowserDriver {
  private config: LaunchOptions;
  private context: BrowserContext | null = null;

  constructor(config?: Partial<LaunchOptions>) {
    this.config = {
      ...DEFAULT_BROWSER_CONFIG,
      ...config,
    };
  }

  /**
   * Launch a persistent Chromium browser context with stealth plugins.
   *
   * Creates the profile directory if it does not exist, configures stealth
   * evasions, and opens a persistent context that preserves cookies and
   * local storage across sessions.
   */
  async launch(): Promise<BrowserContext> {
    if (this.context) {
      return this.context;
    }

    // Ensure profile directory exists
    fs.mkdirSync(this.config.profileDir, { recursive: true });

    // Get stealth-configured chromium
    const chromium = configureStealthBrowser();

    const launchArgs = [
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      ...(this.config.args ?? []),
    ];

    this.context = await chromium.launchPersistentContext(
      this.config.profileDir,
      {
        headless: false, // Hardcoded: Google detects headless mode
        args: launchArgs,
        viewport: this.config.viewport,
        userAgent: this.config.userAgent ?? DEFAULT_USER_AGENT,
        ignoreDefaultArgs: ['--enable-automation'],
      },
    );

    return this.context;
  }

  /**
   * Get the active page, or create one if none exists.
   */
  async getPage(): Promise<Page> {
    if (!this.context) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    const pages = this.context.pages();
    return pages[0] ?? (await this.context.newPage());
  }

  /**
   * Close the browser context gracefully.
   */
  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
  }

  /**
   * Check whether the browser context is currently open.
   */
  get isLaunched(): boolean {
    return this.context !== null;
  }
}
