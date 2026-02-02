/**
 * Answer chain aggregation for multi-turn NotebookLM conversations.
 *
 * Tracks Q&A pairs and provides summarization to prevent unbounded
 * context growth when injecting conversation history into agent prompts.
 */

import type { QAPair } from '../types/bidirectional.js';

export interface AnswerChainOptions {
  maxTurnsBeforeSummary?: number;
}

/**
 * Aggregates multi-turn Q&A conversations with ordering and
 * summarization after a configurable turn threshold.
 */
export class AnswerChain {
  private pairs: QAPair[] = [];
  private maxTurnsBeforeSummary: number;

  constructor(options?: AnswerChainOptions) {
    this.maxTurnsBeforeSummary = options?.maxTurnsBeforeSummary ?? 5;
  }

  /** Append a Q&A pair to the chain. */
  add(pair: QAPair): void {
    this.pairs.push(pair);
  }

  /** Return all pairs in order. */
  getAll(): QAPair[] {
    return [...this.pairs];
  }

  /** Return the most recent pair, or undefined if empty. */
  getLatest(): QAPair | undefined {
    return this.pairs.length > 0
      ? this.pairs[this.pairs.length - 1]
      : undefined;
  }

  /** Find a pair by normalized question match. */
  getExistingAnswer(normalizedQuery: string): QAPair | undefined {
    return this.pairs.find((p) => p.question === normalizedQuery);
  }

  /** True if the chain has reached the summarization threshold. */
  needsSummarization(): boolean {
    return this.pairs.length >= this.maxTurnsBeforeSummary;
  }

  /** Compile all pairs into a condensed text summary. */
  getSummary(): string {
    if (this.pairs.length === 0) {
      return 'No research queries recorded.';
    }

    const lines = [`Key findings from ${this.pairs.length} research queries:`];

    for (const pair of this.pairs) {
      const citations = pair.citations ?? [];
      const citationSuffix =
        citations.length > 0
          ? ` (Sources: ${citations.join(', ')})`
          : '';
      // Truncate long answers to keep summary bounded
      const shortAnswer =
        pair.answer.length > 200
          ? pair.answer.slice(0, 197) + '...'
          : pair.answer;
      lines.push(`- Q: ${pair.question}`);
      lines.push(`  A: ${shortAnswer}${citationSuffix}`);
    }

    return lines.join('\n');
  }

  /**
   * Get conversation context suitable for agent prompt injection.
   *
   * If the chain exceeds the summarization threshold, returns a
   * condensed summary plus the latest pair. Otherwise returns the
   * full chain formatted as text.
   */
  getForContextInjection(): { summary: string; latest: QAPair | undefined } {
    const latest = this.getLatest();

    if (this.needsSummarization()) {
      return { summary: this.getSummary(), latest };
    }

    // Under threshold: format all pairs as readable text
    if (this.pairs.length === 0) {
      return { summary: '', latest: undefined };
    }

    const lines: string[] = [];
    for (const pair of this.pairs) {
      lines.push(`Q: ${pair.question}`);
      lines.push(`A: ${pair.answer}`);
      const citations = pair.citations ?? [];
      if (citations.length > 0) {
        lines.push(`Citations: ${citations.join(', ')}`);
      }
      lines.push('');
    }

    return { summary: lines.join('\n').trim(), latest };
  }

  /** Reset the chain. */
  clear(): void {
    this.pairs = [];
  }

  /** Number of pairs in the chain. */
  get length(): number {
    return this.pairs.length;
  }
}
