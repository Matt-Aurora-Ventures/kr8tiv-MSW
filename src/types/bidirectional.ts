/**
 * Shared types for Phase 3: Bidirectional Communication.
 *
 * Defines data shapes used across query injection, error bridging,
 * answer chaining, and report compilation modules.
 */

export interface QAPair {
  question: string;
  answer: string;
  timestamp: Date;
  source: 'auto-expansion' | 'error-bridge' | 'manual';
  relevanceScore?: number;
  citations?: string[];
}

export interface AgentError {
  message: string;
  file?: string;
  line?: number;
  stackTrace?: string;
  codeSnippet?: string;
  attemptedFixes?: string[];
  technology?: string;
}

export interface AgentContext {
  query: string;
  answer: string;
  citations: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ResearchReport {
  sessionId: string;
  notebook: string;
  taskGoal: string;
  pairs: QAPair[];
  startTime: Date;
  endTime: Date;
}

export interface ErrorQueryOptions {
  /** Maximum query length in characters. @default 2000 */
  maxLength?: number;
  /** Whether to include the stack trace in the query. @default false */
  includeStackTrace?: boolean;
}

export interface DeduplicationResult {
  duplicate: boolean;
  matchedQuery?: string;
  similarity?: number;
}
