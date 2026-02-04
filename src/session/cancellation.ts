/**
 * Cancellation token for cooperative cancellation.
 * Operations check this token to determine if they should abort.
 */
export class CancellationToken {
  private _isCancelled = false;
  private _reason?: string;
  private readonly callbacks: Array<(reason?: string) => void> = [];

  /**
   * Check if cancellation has been requested.
   */
  get isCancelled(): boolean {
    return this._isCancelled;
  }

  /**
   * Get the cancellation reason if cancelled.
   */
  get reason(): string | undefined {
    return this._reason;
  }

  /**
   * Register a callback to be invoked when cancellation is requested.
   */
  onCancelled(callback: (reason?: string) => void): void {
    if (this._isCancelled) {
      // Already cancelled, invoke immediately
      callback(this._reason);
    } else {
      this.callbacks.push(callback);
    }
  }

  /**
   * Throw if cancellation has been requested.
   */
  throwIfCancelled(): void {
    if (this._isCancelled) {
      throw new CancellationError(this._reason);
    }
  }

  /**
   * Internal: Mark as cancelled (used by CancellationSource).
   */
  _cancel(reason?: string): void {
    if (this._isCancelled) return;

    this._isCancelled = true;
    this._reason = reason;

    for (const callback of this.callbacks) {
      try {
        callback(reason);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

/**
 * Source that controls a CancellationToken.
 * The token is given to operations, the source is held by the controller.
 */
export class CancellationSource {
  private readonly _token: CancellationToken;

  constructor() {
    this._token = new CancellationToken();
  }

  /**
   * Get the cancellation token to pass to operations.
   */
  get token(): CancellationToken {
    return this._token;
  }

  /**
   * Request cancellation with optional reason.
   */
  cancel(reason?: string): void {
    this._token._cancel(reason);
  }

  /**
   * Check if already cancelled.
   */
  get isCancelled(): boolean {
    return this._token.isCancelled;
  }
}

/**
 * Error thrown when an operation is cancelled.
 */
export class CancellationError extends Error {
  constructor(reason?: string) {
    super(reason || "Operation was cancelled");
    this.name = "CancellationError";
  }
}

/**
 * Create a cancellation token that auto-cancels after timeout.
 */
export function createTimeoutToken(timeoutMs: number): CancellationSource {
  const source = new CancellationSource();
  setTimeout(() => {
    if (!source.isCancelled) {
      source.cancel(`Timeout after ${timeoutMs}ms`);
    }
  }, timeoutMs);
  return source;
}
