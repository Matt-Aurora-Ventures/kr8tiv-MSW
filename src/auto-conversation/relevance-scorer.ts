/**
 * RelevanceScorer — Uses a local Ollama LLM to score candidate topics
 * for relevance before clicking them. Prevents wasting queries on
 * low-value topics.
 */

import ollama from 'ollama';
import { z } from 'zod';
import type { ScoredTopic } from './types.js';

const RelevanceScoreSchema = z.object({
  taskRelevance: z.number().min(0).max(40),
  errorRelevance: z.number().min(0).max(30),
  implementationValue: z.number().min(0).max(20),
  novelty: z.number().min(0).max(10),
  total: z.number().min(0).max(100),
  reasoning: z.string(),
});

/** JSON Schema for structured Ollama output */
const RELEVANCE_JSON_SCHEMA = {
  type: 'object' as const,
  properties: {
    taskRelevance: { type: 'number' as const, minimum: 0, maximum: 40 },
    errorRelevance: { type: 'number' as const, minimum: 0, maximum: 30 },
    implementationValue: { type: 'number' as const, minimum: 0, maximum: 20 },
    novelty: { type: 'number' as const, minimum: 0, maximum: 10 },
    total: { type: 'number' as const, minimum: 0, maximum: 100 },
    reasoning: { type: 'string' as const },
  },
  required: ['taskRelevance', 'errorRelevance', 'implementationValue', 'novelty', 'total', 'reasoning'],
};

export interface RelevanceScorerConfig {
  model?: string;
}

export class RelevanceScorer {
  private readonly model: string;

  constructor(config: RelevanceScorerConfig = {}) {
    this.model = config.model ?? 'qwen3-coder:latest';
  }

  /**
   * Initialize the scorer: verify Ollama is running, model is available,
   * and warm up the model to avoid cold-start latency.
   */
  async initialize(): Promise<void> {
    // 1. Check Ollama is running
    let models: Awaited<ReturnType<typeof ollama.list>>;
    try {
      models = await ollama.list();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('ECONNREFUSED') || message.includes('fetch failed')) {
        throw new Error(
          'Ollama is not running. Start with `ollama serve`'
        );
      }
      throw new Error(`Failed to connect to Ollama: ${message}`);
    }

    // 2. Check model availability
    const available = models.models.map((m) => m.name);
    const found = available.some(
      (name) => name === this.model || name.startsWith(`${this.model}:`)
    );
    if (!found) {
      throw new Error(
        `Model ${this.model} not found. Pull with \`ollama pull ${this.model}\``
      );
    }

    // 3. Warm up model
    try {
      await ollama.chat({
        model: this.model,
        messages: [{ role: 'user', content: 'Reply with {}' }],
        format: 'json',
      });
    } catch {
      // Warm-up failure is non-fatal
    }

    console.log('Relevance model ready');
  }

  /**
   * Score a candidate topic for relevance to the current task.
   */
  async score(
    candidateTopic: string,
    taskGoal: string,
    currentError: string | null,
    previousTopics: string[]
  ): Promise<ScoredTopic> {
    const prompt = this.buildPrompt(
      candidateTopic,
      taskGoal,
      currentError,
      previousTopics
    );

    try {
      const response = await ollama.chat({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        format: RELEVANCE_JSON_SCHEMA as Record<string, unknown>,
      });

      const parsed = RelevanceScoreSchema.parse(
        JSON.parse(response.message.content)
      );

      return {
        text: candidateTopic,
        level: 0,
        parentTopic: null,
        score: parsed.total,
        reasoning: parsed.reasoning,
        dimensions: {
          taskRelevance: parsed.taskRelevance,
          errorRelevance: parsed.errorRelevance,
          implementationValue: parsed.implementationValue,
          novelty: parsed.novelty,
        },
      };
    } catch {
      return {
        text: candidateTopic,
        level: 0,
        parentTopic: null,
        score: 0,
        reasoning: 'Failed to parse LLM response',
        dimensions: {
          taskRelevance: 0,
          errorRelevance: 0,
          implementationValue: 0,
          novelty: 0,
        },
      };
    }
  }

  /**
   * Dispose of resources. No-op for now — Ollama manages its own lifecycle.
   */
  async dispose(): Promise<void> {
    // No-op
  }

  private buildPrompt(
    candidateTopic: string,
    taskGoal: string,
    currentError: string | null,
    previousTopics: string[]
  ): string {
    const previousList =
      previousTopics.length > 0
        ? `Previously explored topics:\n${previousTopics.map((t) => `- ${t}`).join('\n')}`
        : 'No previous topics explored yet.';

    const errorContext = currentError
      ? `Current error to solve:\n${currentError}`
      : 'No specific error — general exploration.';

    return `You are a relevance scorer for an AI coding assistant. Score how relevant a candidate topic is for the current task.

Task goal: ${taskGoal}

${errorContext}

${previousList}

Candidate topic to score: "${candidateTopic}"

Score on these dimensions:
- taskRelevance (0-40): How directly relevant is this topic to the task goal?
- errorRelevance (0-30): How likely is this topic to help resolve the current error?
- implementationValue (0-20): How much actionable implementation guidance might this provide?
- novelty (0-10): How much new information does this add vs previously explored topics?
- total (0-100): Sum of all dimensions.
- reasoning: Brief explanation of the score.

Respond with JSON only.`;
  }
}
