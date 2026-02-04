/**
 * NotebookNavigator -- connects to a NotebookLM notebook URL and verifies
 * the UI is ready for interaction.
 */

import type { Page } from 'playwright';
import type { NotebookConnection } from '../types/browser.js';
import { createLogger } from '../logging/index.js';
import { QuotaTracker } from '../rate-limiting/index.js';
import { getMetricsCollector } from '../metrics/index.js';

const logger = createLogger('notebook-navigator');
const quotaTracker = new QuotaTracker();
const metrics = getMetricsCollector();

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
    logger.info({ notebookUrl }, 'Navigating to notebook');
    await this.page.goto(notebookUrl, { waitUntil: 'domcontentloaded' });

    // Check if sign-in is required
    const needsAuth = await this.page
      .getByRole('button', { name: /sign in/i })
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (needsAuth) {
      logger.error('NotebookLM authentication required');
      throw new Error(
        'NotebookLM requires authentication. Please run MSW once with a visible browser to log in manually, then restart.',
      );
    }

    // Wait for chat input to appear, indicating readiness
    logger.debug('Waiting for chat input to become ready');
    await this.page
      .getByRole('textbox', { name: /ask|type/i })
      .waitFor({ state: 'visible', timeout: 30000 });

    logger.info('Successfully connected to notebook');
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

  /**
   * Submit a query to NotebookLM with rate limiting enforcement and performance tracking.
   * Throws an error if quota is exceeded.
   */
  async submitQuery(query: string): Promise<void> {
    return metrics.measureAsync('notebooklm.query', async () => {
      // Check quota before submitting
      const quotaCheck = quotaTracker.canRequest();
      if (!quotaCheck.allowed) {
        logger.error({
          remaining: quotaCheck.usage.remaining,
          limit: quotaCheck.usage.limit
        }, 'Query quota exceeded');
        throw new Error(
          `Daily query quota exceeded (${quotaCheck.usage.used}/${quotaCheck.usage.limit}). ` +
          `Quota resets at midnight UTC. Current usage: ${quotaCheck.usage.percentUsed}%`,
        );
      }

      // Log warning if approaching quota
      if (quotaCheck.warning) {
        logger.warn({ remaining: quotaCheck.usage.remaining }, quotaCheck.warning);
      }

      logger.info({ query: query.substring(0, 100) }, 'Submitting query to NotebookLM');

      // Submit the query
      const inputBox = this.page.getByRole('textbox', { name: /ask|type/i });
      await inputBox.fill(query);
      await inputBox.press('Enter');

      // Record successful query
      quotaTracker.recordRequest();
      logger.debug({ remaining: quotaCheck.usage.remaining - 1 }, 'Query submitted successfully');
    });
  }
}
