import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

export interface QuotaState {
  date: string;           // Current day (YYYY-MM-DD)
  used: number;           // Queries used today
  limit: number;          // Daily limit (50 for free, 500 for enterprise)
  lastReset: string;      // Last reset timestamp (ISO)
  history: DayUsage[];    // Last 7 days for analytics
}

interface DayUsage {
  date: string;
  used: number;
}

const DEFAULT_LIMIT = 50;
const HISTORY_DAYS = 7;

export class UsageStore {
  private readonly filePath: string;

  constructor(basePath: string = process.cwd()) {
    this.filePath = join(basePath, ".msw/quota.json");
  }

  load(): QuotaState {
    const today = new Date().toISOString().split("T")[0];

    if (existsSync(this.filePath)) {
      try {
        const saved = JSON.parse(readFileSync(this.filePath, "utf-8")) as QuotaState;

        // Reset if new day
        if (saved.date !== today) {
          // Archive previous day to history
          const history = this.archiveDay(saved);
          return this.createState(today, saved.limit, history);
        }
        return saved;
      } catch {
        // Corrupted file, start fresh
        return this.createState(today);
      }
    }

    return this.createState(today);
  }

  save(state: QuotaState): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.filePath, JSON.stringify(state, null, 2));
  }

  private createState(
    date: string,
    limit: number = DEFAULT_LIMIT,
    history: DayUsage[] = []
  ): QuotaState {
    return {
      date,
      used: 0,
      limit,
      lastReset: new Date().toISOString(),
      history,
    };
  }

  private archiveDay(state: QuotaState): DayUsage[] {
    const history = [...(state.history || [])];

    // Add previous day to history
    if (state.used > 0) {
      history.unshift({ date: state.date, used: state.used });
    }

    // Keep only last N days
    return history.slice(0, HISTORY_DAYS);
  }

  /**
   * Update the daily limit (for enterprise accounts).
   */
  setLimit(limit: number): void {
    const state = this.load();
    state.limit = limit;
    this.save(state);
  }

  getFilePath(): string {
    return this.filePath;
  }
}
