/**
 * NotebookNavigator -- connects to a NotebookLM notebook URL and verifies
 * the UI is ready for interaction.
 */

import type { Page } from 'playwright';
import type { NotebookConnection } from '../types/browser.js';

export class NotebookNavigator {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Navigate to a NotebookLM notebook URL, detect authentication status,
   * and wait for the chat interface to become ready.
   */
  async connect(notebookUrl: string): Promise<NotebookConnection> {
    await this.page.goto(notebookUrl, { waitUntil: 'domcontentloaded' });

    // Check if sign-in is required
    const needsAuth = await this.page
      .getByRole('button', { name: /sign in/i })
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (needsAuth) {
      throw new Error(
        'NotebookLM requires authentication. Please run MSW once with a visible browser to log in manually, then restart.',
      );
    }

    // Wait for chat input to appear, indicating readiness
    await this.page
      .getByRole('textbox', { name: /ask|type/i })
      .waitFor({ state: 'visible', timeout: 30000 });

    return { connected: true, url: notebookUrl };
  }

  /**
   * Check whether the chat input textbox is currently visible.
   */
  async isReady(): Promise<boolean> {
    return this.page
      .getByRole('textbox', { name: /ask|type/i })
      .isVisible()
      .catch(() => false);
  }

  /**
   * Best-effort extraction of the notebook title from the page.
   */
  async getNotebookTitle(): Promise<string> {
    try {
      const title = await this.page.title();
      // NotebookLM titles typically follow "Title - NotebookLM"
      const match = title.match(/^(.+?)\s*[-–]\s*NotebookLM/);
      return match ? match[1].trim() : title || 'Unknown';
    } catch {
      return 'Unknown';
    }
  }
}
