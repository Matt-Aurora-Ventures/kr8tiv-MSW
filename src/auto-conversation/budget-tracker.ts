/**
 * Budget tracker for NotebookLM daily query limits.
 *
 * Persists daily query count to a JSON file and auto-resets on new day.
 * Warns when approaching the 80% threshold of the daily limit.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { BudgetState } from './types.js';

export interface BudgetTrackerOptions {
  dailyLimit?: number;
  budgetPath?: string;
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export class BudgetTracker {
  private state: BudgetState;
  private readonly filePath: string;

  constructor(opts: BudgetTrackerOptions = {}) {
    const limit = opts.dailyLimit ?? 50;
    this.filePath = opts.budgetPath ?? path.join(process.cwd(), '.msw', 'budget.json');
    this.state = this.load(limit);
  }

  /** True if there are remaining queries today. */
  canQuery(): boolean {
    this.checkDayReset();
    return this.state.queriesUsed < this.state.limit;
  }

  /** Number of queries remaining today. */
  remaining(): number {
    this.checkDayReset();
    return this.state.limit - this.state.queriesUsed;
  }

  /** Record one query used and persist to disk. */
  consume(): void {
    this.checkDayReset();
    this.state.queriesUsed += 1;
    this.persist();
  }

  /** True when 80% or more of the daily budget is consumed. */
  isNearLimit(): boolean {
    this.checkDayReset();
    return this.state.queriesUsed / this.state.limit >= 0.8;
  }

  /** Human-readable warning string, or null if no warning needed. */
  getWarning(): string | null {
    this.checkDayReset();
    const { queriesUsed, limit } = this.state;
    const remaining = limit - queriesUsed;

    if (queriesUsed >= limit) {
      return `Budget exhausted: ${limit}/${limit} queries used today`;
    }
    if (this.isNearLimit()) {
      return `Warning: ${queriesUsed}/${limit} queries used today (${remaining} remaining)`;
    }
    return null;
  }

  // --- internals ---

  private checkDayReset(): void {
    const today = todayString();
    if (this.state.date !== today) {
      this.state.date = today;
      this.state.queriesUsed = 0;
      this.persist();
    }
  }

  private load(defaultLimit: number): BudgetState {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as BudgetState;
      // Preserve the persisted limit only if no explicit override
      return {
        date: parsed.date ?? todayString(),
        queriesUsed: parsed.queriesUsed ?? 0,
        limit: parsed.limit ?? defaultLimit,
      };
    } catch {
      // File missing or corrupt — start fresh
      const fresh: BudgetState = {
        date: todayString(),
        queriesUsed: 0,
        limit: defaultLimit,
      };
      this.filePath; // ensure assigned before persist
      return fresh;
    }
  }

  private persist(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2) + '\n', 'utf-8');
  }
}
