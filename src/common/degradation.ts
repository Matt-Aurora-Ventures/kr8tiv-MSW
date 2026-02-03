/**
 * Graceful Degradation Handler
 *
 * Provides fallback mechanisms and graceful handling of failures.
 * Ensures MSW continues working in degraded states with clear user communication.
 */

export interface DegradationContext {
  operation: string;
  attempted: string[];
  successful?: string;
  userMessage: string;
}

export type DegradationLevel = 'full' | 'degraded' | 'minimal' | 'failed';

export class DegradationHandler {
  private contexts: DegradationContext[] = [];

  /**
   * Try operation with fallbacks
   */
  async withFallbacks<T>(
    operation: string,
    attempts: Array<{ name: string; fn: () => Promise<T> }>,
  ): Promise<{ result?: T; context: DegradationContext }> {
    const attempted: string[] = [];
    let lastError: Error | undefined;

    for (const attempt of attempts) {
      attempted.push(attempt.name);

      try {
        const result = await attempt.fn();

        const context: DegradationContext = {
          operation,
          attempted,
          successful: attempt.name,
          userMessage: this.generateSuccessMessage(operation, attempt.name, attempted.length > 1),
        };

        this.contexts.push(context);
        return { result, context };
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[degradation] ${attempt.name} failed:`, lastError.message);
        // Continue to next fallback
      }
    }

    // All attempts failed
    const context: DegradationContext = {
      operation,
      attempted,
      userMessage: this.generateFailureMessage(operation, attempted, lastError),
    };

    this.contexts.push(context);
    return { context };
  }

  /**
   * Generate user-friendly success message
   */
  private generateSuccessMessage(
    operation: string,
    successful: string,
    hadFallbacks: boolean,
  ): string {
    if (!hadFallbacks) {
      return `${operation} completed successfully`;
    }

    return `${operation} completed using fallback: ${successful}. Primary method failed but service is operational.`;
  }

  /**
   * Generate user-friendly failure message
   */
  private generateFailureMessage(
    operation: string,
    attempted: string[],
    error?: Error,
  ): string {
    const attemptedList = attempted.join(', ');
    const errorMsg = error ? `: ${error.message}` : '';

    return `${operation} failed after trying: ${attemptedList}${errorMsg}. Please check connectivity and configuration.`;
  }

  /**
   * Get degradation level based on context history
   */
  getDegradationLevel(): DegradationLevel {
    if (this.contexts.length === 0) {
      return 'full';
    }

    const recentContexts = this.contexts.slice(-5); // Last 5 operations
    const failedCount = recentContexts.filter((c) => !c.successful).length;
    const fallbackCount = recentContexts.filter((c) => c.attempted.length > 1 && c.successful).length;

    if (failedCount === recentContexts.length) {
      return 'failed';
    }

    if (failedCount > recentContexts.length / 2) {
      return 'minimal';
    }

    if (fallbackCount > 0) {
      return 'degraded';
    }

    return 'full';
  }

  /**
   * Get summary of degradation contexts
   */
  getSummary(): {
    level: DegradationLevel;
    successRate: number;
    fallbackRate: number;
    recentFailures: string[];
  } {
    const total = this.contexts.length;

    if (total === 0) {
      return {
        level: 'full',
        successRate: 1.0,
        fallbackRate: 0,
        recentFailures: [],
      };
    }

    const successful = this.contexts.filter((c) => c.successful).length;
    const fallbacks = this.contexts.filter((c) => c.attempted.length > 1 && c.successful).length;
    const recentFailed = this.contexts
      .slice(-10)
      .filter((c) => !c.successful)
      .map((c) => c.operation);

    return {
      level: this.getDegradationLevel(),
      successRate: successful / total,
      fallbackRate: fallbacks / total,
      recentFailures: recentFailed,
    };
  }

  /**
   * Clear context history
   */
  reset(): void {
    this.contexts = [];
  }

  /**
   * Get human-readable status
   */
  getStatusMessage(): string {
    const level = this.getDegradationLevel();

    const messages = {
      full: '✓ All systems operational',
      degraded: '⚠ Service degraded - using fallback mechanisms',
      minimal: '⚠ Minimal functionality - experiencing issues',
      failed: '✗ Service unavailable - all operations failing',
    };

    return messages[level];
  }
}

/**
 * Global degradation handler instance
 */
export const globalDegradation = new DegradationHandler();

/**
 * Common fallback strategies
 */
export const fallbackStrategies = {
  /**
   * Browser launch with fallback to visible mode
   */
  browserLaunch: (headless: boolean) => [
    {
      name: headless ? 'headless-browser' : 'visible-browser',
      fn: async () => {
        // Primary launch attempt (implemented by caller)
        throw new Error('Implement in caller');
      },
    },
    {
      name: 'visible-browser',
      fn: async () => {
        // Fallback to visible (implemented by caller)
        throw new Error('Implement in caller');
      },
    },
  ],

  /**
   * Network request with retries and timeout adjustments
   */
  networkRequest: <T>(request: () => Promise<T>) => [
    {
      name: 'normal-timeout',
      fn: request,
    },
    {
      name: 'extended-timeout',
      fn: async () => {
        // Retry with longer timeout (implemented by caller)
        return request();
      },
    },
    {
      name: 'offline-mode',
      fn: async () => {
        throw new Error('Network unavailable - operate in offline mode');
      },
    },
  ],
};
