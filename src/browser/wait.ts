/**
 * Streaming completion detection utilities.
 *
 * NotebookLM streams responses token-by-token. These utilities detect when
 * streaming is complete by polling for content stability rather than using
 * fixed timeouts.
 */

import type { Locator, Page } from 'playwright';

declare global {
  interface Window {
    __mswLastContent?: string;
    __mswStableCount?: number;
  }
}

export interface WaitForStreamingOptions {
  /** Polling interval in milliseconds. @default 1000 */
  pollMs?: number;
  /** Number of consecutive stable checks required. @default 3 */
  stableCount?: number;
  /** Maximum wait time in milliseconds. @default 60000 */
  timeoutMs?: number;
}

/**
 * Wait for streamed content to stabilize inside the element matching `selector`.
 *
 * Polls the element's textContent at `pollMs` intervals. When the content
 * remains unchanged for `stableCount` consecutive checks (and is non-empty),
 * the function resolves. Rejects after `timeoutMs`.
 */
export async function waitForStreamingComplete(
  page: Page,
  selector: string,
  opts: WaitForStreamingOptions = {},
): Promise<void> {
  const { pollMs = 1000, stableCount = 3, timeoutMs = 60000 } = opts;

  // Reset window globals before starting
  await page.evaluate(() => {
    window.__mswLastContent = undefined;
    window.__mswStableCount = 0;
  });

  await page.waitForFunction(
    ({ sel, target }) => {
      const el = document.querySelector(sel);
      if (!el) return false;

      const content = el.textContent ?? '';
      if (content.length === 0) return false;

      if (content === window.__mswLastContent) {
        window.__mswStableCount = (window.__mswStableCount ?? 0) + 1;
      } else {
        window.__mswLastContent = content;
        window.__mswStableCount = 1;
      }

      return (window.__mswStableCount ?? 0) >= target;
    },
    { sel: selector, target: stableCount },
    { polling: pollMs, timeout: timeoutMs },
  );

  // Clean up window globals
  await page.evaluate(() => {
    delete window.__mswLastContent;
    delete window.__mswStableCount;
  });
}

/**
 * Wait for a locator to become visible on the page.
 * Returns the locator for chaining.
 */
export async function waitForElement(
  _page: Page,
  locator: Locator,
  timeoutMs = 10000,
): Promise<Locator> {
  await locator.waitFor({ state: 'visible', timeout: timeoutMs });
  return locator;
}
