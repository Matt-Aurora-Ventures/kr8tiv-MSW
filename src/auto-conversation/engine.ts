/**
 * TopicExpansionEngine — Orchestrates BFS topic expansion across NotebookLM.
 *
 * Combines TopicDetector, RelevanceScorer, BudgetTracker, TopicClicker,
 * and ExpansionState into a single expansion pipeline:
 *   detect pills -> score -> click -> extract -> discover new pills -> repeat
 */

import type { Page } from 'playwright';
import type { ExpansionConfig, ExpansionResult, ScoredTopic } from './types.js';
import { TopicDetector } from './topic-detector.js';
import { RelevanceScorer } from './relevance-scorer.js';
import { BudgetTracker } from './budget-tracker.js';
import { TopicClicker } from './topic-clicker.js';
import { ExpansionState } from './expansion-state.js';

export class TopicExpansionEngine {
  private readonly detector: TopicDetector;
  private readonly scorer: RelevanceScorer;
  private readonly budget: BudgetTracker;
  private readonly clicker: TopicClicker;
  private readonly state: ExpansionState;
  private readonly config: ExpansionConfig;
  private stopped = false;
  private readonly failures = new Map<string, string>();

  constructor({ page, config }: { page: Page; config: ExpansionConfig }) {
    this.config = config;
    this.detector = new TopicDetector(page);
    this.scorer = new RelevanceScorer();
    this.budget = new BudgetTracker({ dailyLimit: config.maxQueries });
    this.clicker = new TopicClicker(page);
    this.state = new ExpansionState(config);
  }

  /**
   * Initialize the engine: set up the relevance scorer and browser.
   */
  async initialize(): Promise<void> {
    await this.scorer.initialize();
    console.log('[engine] TopicExpansionEngine ready');
  }

  /**
   * Run the full BFS expansion loop.
   *
   * 1. Seed: detect initial topic pills, score, and enqueue.
   * 2. Loop: dequeue highest-score topic, click, extract, discover new pills.
   * 3. Return aggregated results.
   */
  async run(): Promise<ExpansionResult> {
    // --- Seed phase ---
    const initialPills = await this.detector.detectPills();
    console.log(`[engine] Seed phase: detected ${initialPills.length} initial pills`);

    const previousTopics: string[] = [];
    await this.seedTopics(initialPills, previousTopics);

    // --- Expansion loop ---
    while (this.state.canContinue() && this.budget.canQuery() && !this.stopped) {
      const topic = this.state.dequeue();
      if (topic === null) break;

      if (topic.level > this.config.maxLevel) {
        console.log(`[engine] Skipping "${topic.text}" — exceeds maxLevel ${this.config.maxLevel}`);
        continue;
      }

      console.log(
        `[engine] Expanding [level ${topic.level}]: "${topic.text}" (score: ${topic.score})`,
      );

      const budgetWarning = this.budget.getWarning();
      if (budgetWarning) {
        console.log(`[engine] ${budgetWarning}`);
      }

      this.state.markVisited(topic.text);
      this.budget.consume();

      try {
        const response = await this.clicker.clickAndExtract(topic.text);
        this.state.addResponse(topic.text, response);
        previousTopics.push(topic.text);

        // Discover new pills from the response
        const newPills = await this.detector.detectNewPills(
          new Set(previousTopics.map((t) => t.toLowerCase())),
        );
        console.log(`[engine] Discovered ${newPills.length} new pills`);

        await this.scoreAndEnqueue(newPills, topic, previousTopics);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[engine] Failed on "${topic.text}": ${message}`);
        this.failures.set(topic.text, message);
      }

      const stats = this.state.getStats();
      console.log(
        `[engine] Stats: queued=${stats.queued} visited=${stats.visited} responses=${stats.responses} queries=${stats.queriesUsed}`,
      );
    }

    // --- Completion ---
    const result = this.state.getResult();
    console.log(
      `[engine] Complete: ${result.topicsExpanded} expanded, ${result.topicsSkipped} skipped, ` +
        `${result.queriesUsed} queries used, max level ${result.maxLevelReached}`,
    );
    if (this.failures.size > 0) {
      console.log(`[engine] ${this.failures.size} failures encountered`);
    }

    return result;
  }

  /**
   * Signal the engine to stop after the current topic completes.
   */
  stop(): void {
    this.stopped = true;
    console.log('[engine] Stop requested — will finish current topic and halt');
  }

  // --- Private helpers ---

  private async seedTopics(
    pills: string[],
    previousTopics: string[],
  ): Promise<void> {
    for (const pill of pills) {
      const scored = await this.scorer.score(
        pill,
        this.config.taskGoal,
        this.config.currentError,
        previousTopics,
      );
      // Seed topics start at level 0 with no parent
      const topic: ScoredTopic = { ...scored, level: 0, parentTopic: null };
      this.state.enqueue(topic);
    }
  }

  private async scoreAndEnqueue(
    pills: string[],
    parent: ScoredTopic,
    previousTopics: string[],
  ): Promise<void> {
    for (const pill of pills) {
      const scored = await this.scorer.score(
        pill,
        this.config.taskGoal,
        this.config.currentError,
        previousTopics,
      );
      const topic: ScoredTopic = {
        ...scored,
        level: parent.level + 1,
        parentTopic: parent.text,
      };
      this.state.enqueue(topic);
    }
  }
}
