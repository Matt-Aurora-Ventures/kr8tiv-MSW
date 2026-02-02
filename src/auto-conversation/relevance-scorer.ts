/**
 * RelevanceScorer — Uses lightweight string-similarity scoring to filter
 * candidate topics. The host LLM (running in the IDE) handles intelligent
 * topic selection; this provides a fast default filter.
 */

import stringSimilarity from 'string-similarity';
import type { ScoredTopic } from './types.js';

export interface RelevanceScorerConfig {
  // No config needed — scoring is purely local
}

export class RelevanceScorer {
  constructor(_config: RelevanceScorerConfig = {}) {
    // No-op
  }

  /**
   * Initialize the scorer. No-op — no external services needed.
   */
  async initialize(): Promise<void> {
    // No model to warm up
  }

  /**
   * Score a candidate topic for relevance to the current task using
   * string similarity between the topic and task/error context.
   */
  async score(
    candidateTopic: string,
    taskGoal: string,
    currentError: string | null,
    previousTopics: string[]
  ): Promise<ScoredTopic> {
    const topicLower = candidateTopic.toLowerCase();
    const goalLower = taskGoal.toLowerCase();

    // Task relevance (0-40): similarity to goal
    const goalSim = stringSimilarity.compareTwoStrings(topicLower, goalLower);
    const taskRelevance = Math.round(goalSim * 40);

    // Error relevance (0-30): similarity to current error
    let errorRelevance = 0;
    if (currentError) {
      const errorLower = currentError.toLowerCase();
      const errorSim = stringSimilarity.compareTwoStrings(topicLower, errorLower);
      errorRelevance = Math.round(errorSim * 30);
    }

    // Implementation value (0-20): bonus for implementation-related keywords
    const implKeywords = ['how to', 'implement', 'setup', 'configure', 'install', 'fix', 'debug', 'example', 'tutorial', 'guide', 'code', 'api', 'function', 'method'];
    const implMatches = implKeywords.filter((kw) => topicLower.includes(kw)).length;
    const implementationValue = Math.min(20, implMatches * 5);

    // Novelty (0-10): penalize if similar to previously explored topics
    let novelty = 10;
    if (previousTopics.length > 0) {
      const bestMatch = stringSimilarity.findBestMatch(
        topicLower,
        previousTopics.map((t) => t.toLowerCase())
      );
      // High similarity to previous = low novelty
      novelty = Math.round((1 - bestMatch.bestMatch.rating) * 10);
    }

    const total = taskRelevance + errorRelevance + implementationValue + novelty;

    return {
      text: candidateTopic,
      level: 0,
      parentTopic: null,
      score: total,
      reasoning: `String-similarity scoring: goal=${taskRelevance}, error=${errorRelevance}, impl=${implementationValue}, novelty=${novelty}`,
      dimensions: {
        taskRelevance,
        errorRelevance,
        implementationValue,
        novelty,
      },
    };
  }

  /**
   * Dispose of resources. No-op — no external services to clean up.
   */
  async dispose(): Promise<void> {
    // No-op
  }
}
