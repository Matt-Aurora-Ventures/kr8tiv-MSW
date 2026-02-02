/**
 * Shared type definitions for the auto-conversation expansion engine.
 */

export interface Topic {
  text: string;
  level: number;
  parentTopic: string | null;
  score: number;
}

export interface ScoredTopic extends Topic {
  reasoning: string;
  dimensions: {
    taskRelevance: number;
    errorRelevance: number;
    implementationValue: number;
    novelty: number;
  };
}

export interface ExpansionConfig {
  taskGoal: string;
  currentError: string | null;
  threshold: number;
  maxLevel: number;
  maxQueries: number;
  model: string;
}

export interface ExpansionResult {
  responses: Map<string, string>;
  topicsExpanded: number;
  topicsSkipped: number;
  queriesUsed: number;
  maxLevelReached: number;
  tree: Topic[];
}

export interface BudgetState {
  date: string;
  queriesUsed: number;
  limit: number;
}
