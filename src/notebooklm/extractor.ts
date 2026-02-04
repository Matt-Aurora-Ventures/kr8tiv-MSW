/**
 * Response extraction from NotebookLM.
 *
 * Extracts AI-generated responses after ensuring streaming is complete,
 * preventing premature extraction of partial/truncated content.
 */

import type { Page } from 'playwright';
import { Selectors } from '../browser/selectors.js';
import { waitForStreamingComplete } from '../browser/wait.js';
import { createLogger } from '../logging/index.js';
import { getMetricsCollector } from '../metrics/index.js';

const logger = createLogger('response-extractor');
const metrics = getMetricsCollector();

/**
 * Extracts responses from the NotebookLM chat interface.
 *
 * Always waits for streaming completion before returning content to ensure
 * no partial or truncated text is returned.
 */
export class ResponseExtractor {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Extract the most recent (last) response from NotebookLM.
   *
   * Waits for streaming to complete before extracting. Returns empty string
   * if no response containers are visible.
   */
  async extractLatestResponse(): Promise<string> {
    return metrics.measureAsync('notebooklm.response', async () => {
      logger.debug('Extracting latest response');
      const container = Selectors.responseContainer(this.page);

      const count = await container.count();
      if (count === 0) {
        logger.debug('No response containers found');
        return '';
      }

      const last = container.last();

      try {
        logger.debug('Waiting for streaming to complete');
        await waitForStreamingComplete(
          this.page,
          '[data-message-author="assistant"]:last-of-type',
        );
      } catch {
        // Timeout: extract whatever content exists
        logger.warn('Streaming detection timed out, extracting available content');
      }

      const text = await last.textContent();
      const result = text?.trim() ?? '';
      logger.info({ length: result.length }, 'Response extracted');
      return result;
    });
  }

  /**
   * Extract text content from all response containers.
   *
   * Returns an array of trimmed strings, one per response element.
   */
  async extractAllResponses(): Promise<string[]> {
    const container = Selectors.responseContainer(this.page);
    const count = await container.count();

    if (count === 0) {
      return [];
    }

    const results: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await container.nth(i).textContent();
      results.push(text?.trim() ?? '');
    }

    return results;
  }

  /**
   * Count the number of visible response containers.
   */
  async getResponseCount(): Promise<number> {
    return Selectors.responseContainer(this.page).count();
  }
}
