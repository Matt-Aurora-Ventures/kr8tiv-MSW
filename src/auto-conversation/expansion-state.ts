/**
 * Manages BFS priority queue, visited set, and response collection
 * for multi-level topic expansion.
 */

import { normalizeTopic } from './topic-detector.js';
import type { ExpansionConfig, ExpansionResult, ScoredTopic, Topic } from './types.js';

export class ExpansionState {
  private visited = new Set<string>();
  private queue: ScoredTopic[] = [];
  private responses = new Map<string, string>();
  private tree: Topic[] = [];
  private queriesUsed = 0;
  private maxLevelReached = 0;

  constructor(private readonly config: ExpansionConfig) {}

  /**
   * Add topic to queue if not visited and score >= threshold.
   * Returns true if added, false if duplicate or below threshold.
   */
  enqueue(topic: ScoredTopic): boolean {
    const key = normalizeTopic(topic.text);
    if (this.visited.has(key)) return false;
    if (topic.score < this.config.threshold) return false;

    // Check queue for duplicates
    if (this.queue.some((t) => normalizeTopic(t.text) === key)) return false;

    this.queue.push(topic);
    this.queue.sort((a, b) => b.score - a.score);
    this.tree.push(topic);
    return true;
  }

  /** Pop highest-score topic from queue, or null if empty. */
  dequeue(): ScoredTopic | null {
    return this.queue.shift() ?? null;
  }

  /** Mark topic as visited and increment query count. */
  markVisited(topicText: string): void {
    this.visited.add(normalizeTopic(topicText));
    this.queriesUsed++;
  }

  /** Check if topic has been visited. */
  isVisited(topicText: string): boolean {
    return this.visited.has(normalizeTopic(topicText));
  }

  /** Store a response and update max level reached. */
  addResponse(topicText: string, response: string): void {
    this.responses.set(topicText, response);
    const topic = this.tree.find(
      (t) => normalizeTopic(t.text) === normalizeTopic(topicText),
    );
    if (topic && topic.level > this.maxLevelReached) {
      this.maxLevelReached = topic.level;
    }
  }

  /** True if queue has items and query budget remains. */
  canContinue(): boolean {
    return this.queue.length > 0 && this.queriesUsed < this.config.maxQueries;
  }

  /** Build the final expansion result. */
  getResult(): ExpansionResult {
    return {
      responses: new Map(this.responses),
      topicsExpanded: this.visited.size,
      topicsSkipped: this.tree.length - this.visited.size,
      queriesUsed: this.queriesUsed,
      maxLevelReached: this.maxLevelReached,
      tree: [...this.tree],
    };
  }

  /** Quick stats for logging. */
  getStats(): {
    queued: number;
    visited: number;
    responses: number;
    queriesUsed: number;
  } {
    return {
      queued: this.queue.length,
      visited: this.visited.size,
      responses: this.responses.size,
      queriesUsed: this.queriesUsed,
    };
  }
}
