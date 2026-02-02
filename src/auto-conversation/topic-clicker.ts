/**
 * Topic clicker for NotebookLM auto-conversation.
 *
 * Clicks a suggested topic pill with humanized behaviour, waits for the
 * streamed response to stabilize, then extracts the response text.
 */

import type { Page } from 'playwright';
import { humanClick } from '../browser/humanize.js';
import { waitForStreamingComplete } from '../browser/wait.js';
import { ResponseExtractor } from '../notebooklm/extractor.js';

export class TopicClicker {
  private readonly page: Page;
  private readonly extractor: ResponseExtractor;

  constructor(page: Page) {
    this.page = page;
    this.extractor = new ResponseExtractor(page);
  }

  /**
   * Click a topic pill by its visible text and return the AI response.
   *
   * @throws Error with prefix "TopicNotFound:" if pill is not visible within 5s.
   * @throws Error with prefix "StreamingTimeout:" if response never stabilizes.
   */
  async clickAndExtract(topicText: string): Promise<string> {
    // 1. Locate the button
    let button = this.page.getByRole('button', { name: topicText });
    const primaryCount = await button.count();

    if (primaryCount === 0) {
      // Fallback: partial text match
      button = this.page.locator('button').filter({ hasText: topicText });
    }

    try {
      await button.first().waitFor({ state: 'visible', timeout: 5000 });
    } catch {
      throw new Error(`TopicNotFound: Could not find topic pill "${topicText}"`);
    }

    // 2. Click with humanized behaviour
    await humanClick(button.first());

    // 3. Wait for streaming to complete
    try {
      await waitForStreamingComplete(
        this.page,
        '[data-message-author="assistant"]:last-of-type',
        { timeoutMs: 60000 },
      );
    } catch {
      throw new Error(`StreamingTimeout: Response did not complete for "${topicText}"`);
    }

    // 4. Extract and return the response
    const response = await this.extractor.extractLatestResponse();
    return response;
  }
}
