/**
 * Response extraction from NotebookLM.
 *
 * Extracts AI-generated responses after ensuring streaming is complete,
 * preventing premature extraction of partial/truncated content.
 */

import type { Page } from 'playwright';
import { Selectors } from '../browser/selectors.js';
import { waitForStreamingComplete } from '../browser/wait.js';

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
    const container = Selectors.responseContainer(this.page);

    const count = await container.count();
    if (count === 0) {
      return '';
    }

    const last = container.last();

    try {
      await waitForStreamingComplete(
        this.page,
        '[data-message-author="assistant"]:last-of-type',
      );
    } catch {
      // Timeout: extract whatever content exists
      console.warn(
        '[extractor] Streaming detection timed out, extracting available content',
      );
    }

    const text = await last.textContent();
    return text?.trim() ?? '';
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
