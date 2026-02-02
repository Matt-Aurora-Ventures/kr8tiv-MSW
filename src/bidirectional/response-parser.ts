/**
 * Response parsing with citation extraction from NotebookLM.
 *
 * Citation extraction is best-effort -- NotebookLM's citation format
 * is not guaranteed to be stable. This module never throws.
 */

import type { Page } from 'playwright';
import { Selectors } from '../browser/selectors.js';

/**
 * Extract source citations from NotebookLM response text (best-effort).
 *
 * Looks for:
 * - Bracketed references: [1], [2], [Source Name]
 * - "According to" / "Based on" phrases with bracketed sources
 *
 * Returns deduplicated citation strings. Never throws.
 */
export function parseCitations(responseText: string): string[] {
  if (!responseText) {
    return [];
  }

  const citations = new Set<string>();

  try {
    // Pattern 1: Bracketed numeric references like [1], [2], [12]
    const numericRefs = responseText.match(/\[(\d+)\]/g);
    if (numericRefs) {
      for (const ref of numericRefs) {
        citations.add(ref);
      }
    }

    // Pattern 2: Bracketed named sources like [Source Name], [Document Title]
    // Exclude pure numbers (already captured) and very short matches
    const namedRefs = responseText.match(/\[([A-Za-z][^\]]{1,80})\]/g);
    if (namedRefs) {
      for (const ref of namedRefs) {
        citations.add(ref);
      }
    }

    // Pattern 3: "According to [source]" or "Based on [source]" phrases
    const phrasePattern =
      /(?:according to|based on|as (?:stated|noted|described|mentioned) in)\s+\[?([^\].\n]{2,60})\]?/gi;
    let match: RegExpExecArray | null;
    while ((match = phrasePattern.exec(responseText)) !== null) {
      const source = match[1].trim();
      if (source) {
        citations.add(`[${source}]`);
      }
    }
  } catch {
    // Best-effort: return whatever we collected so far
  }

  return Array.from(citations);
}

/**
 * Parses responses from the NotebookLM chat interface,
 * extracting text content and source citations.
 */
export class ResponseParser {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Parse the most recent assistant response for text and citations.
   */
  async parseLatestResponse(): Promise<{ text: string; citations: string[] }> {
    try {
      const container = Selectors.responseContainer(this.page);
      const count = await container.count();

      if (count === 0) {
        return { text: '', citations: [] };
      }

      const text = (await container.last().textContent())?.trim() ?? '';
      const citations = parseCitations(text);

      return { text, citations };
    } catch {
      return { text: '', citations: [] };
    }
  }

  /**
   * Parse all assistant responses for text and citations.
   */
  async parseAllResponses(): Promise<
    Array<{ text: string; citations: string[] }>
  > {
    try {
      const container = Selectors.responseContainer(this.page);
      const count = await container.count();

      if (count === 0) {
        return [];
      }

      const results: Array<{ text: string; citations: string[] }> = [];
      for (let i = 0; i < count; i++) {
        const text =
          (await container.nth(i).textContent())?.trim() ?? '';
        results.push({ text, citations: parseCitations(text) });
      }

      return results;
    } catch {
      return [];
    }
  }
}
