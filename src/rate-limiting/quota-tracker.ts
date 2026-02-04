import { UsageStore, type QuotaState } from "./usage-store.js";

const WARNING_THRESHOLD = 0.8; // 80% (HARD-09)

export interface QuotaUsage {
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  resetTime: string;
  isWarning: boolean;
  isExhausted: boolean;
}

export interface QuotaCheckResult {
  allowed: boolean;
  warning?: string;
  usage: QuotaUsage;
}

export class QuotaTracker {
  private state: QuotaState;
  private store: UsageStore;

  constructor(basePath?: string) {
    this.store = new UsageStore(basePath);
    this.state = this.store.load();
  }

  /**
   * Check if a request can proceed. Returns status with warning if approaching limit.
   * HARD-09: Warns at 80% quota threshold.
   */
  canRequest(): QuotaCheckResult {
    // Reload state in case of date change
    this.state = this.store.load();
    const usage = this.getUsage();

    if (usage.isExhausted) {
      return {
        allowed: false,
        warning: `Daily quota exhausted (${usage.used}/${usage.limit}). Resets at ${this.formatResetTime(usage.resetTime)}.`,
        usage,
      };
    }

    if (usage.isWarning) {
      return {
        allowed: true,
        warning: `Approaching quota limit: ${usage.remaining} requests remaining today.`,
        usage,
      };
    }

    return { allowed: true, usage };
  }

  /**
   * Record that a request was made. Call AFTER successful request.
   */
  recordRequest(): void {
    this.state.used++;
    this.store.save(this.state);
  }

  /**
   * Get current usage statistics (HARD-10: for dashboard display).
   */
  getUsage(): QuotaUsage {
    const resetTime = this.calculateResetTime();
    const percentUsed = Math.round((this.state.used / this.state.limit) * 100);

    return {
      used: this.state.used,
      limit: this.state.limit,
      remaining: Math.max(0, this.state.limit - this.state.used),
      percentUsed,
      resetTime: resetTime.toISOString(),
      isWarning: percentUsed >= WARNING_THRESHOLD * 100,
      isExhausted: this.state.used >= this.state.limit,
    };
  }

  /**
   * Get usage history for analytics.
   */
  getHistory(): Array<{ date: string; used: number }> {
    return [
      { date: this.state.date, used: this.state.used },
      ...(this.state.history || []),
    ];
  }

  /**
   * Update daily limit (for enterprise accounts).
   */
  setLimit(limit: number): void {
    this.state.limit = limit;
    this.store.save(this.state);
  }

  private calculateResetTime(): Date {
    const resetTime = new Date(this.state.date);
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);
    return resetTime;
  }

  private formatResetTime(isoTime: string): string {
    const date = new Date(isoTime);
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}
