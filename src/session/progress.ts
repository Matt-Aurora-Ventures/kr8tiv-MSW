export type ProgressStatus = "pending" | "running" | "completed" | "failed" | "cancelled";

export interface ProgressState {
  sessionId: string;
  operation: string;
  status: ProgressStatus;
  progress: number;       // 0-100
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
  startedAt: string;
  updatedAt: string;
  error?: string;
  eta?: string;           // Estimated time remaining (ISO)
}

export type ProgressCallback = (state: ProgressState) => void;

/**
 * Progress tracker for long-running operations.
 */
export class ProgressTracker {
  private state: ProgressState;
  private readonly callbacks: ProgressCallback[] = [];

  constructor(sessionId: string, operation: string) {
    this.state = {
      sessionId,
      operation,
      status: "pending",
      progress: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Register a callback for progress updates.
   */
  onProgress(callback: ProgressCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Start the operation.
   */
  start(totalSteps?: number): void {
    this.update({
      status: "running",
      totalSteps,
      completedSteps: 0,
    });
  }

  /**
   * Update progress percentage (0-100).
   */
  setProgress(progress: number, currentStep?: string): void {
    this.update({
      progress: Math.min(100, Math.max(0, progress)),
      currentStep,
    });
  }

  /**
   * Complete a step.
   */
  completeStep(stepName?: string): void {
    const completedSteps = (this.state.completedSteps || 0) + 1;
    const totalSteps = this.state.totalSteps || completedSteps;
    const progress = Math.round((completedSteps / totalSteps) * 100);

    this.update({
      completedSteps,
      progress,
      currentStep: stepName,
    });
  }

  /**
   * Mark operation as completed.
   */
  complete(): void {
    this.update({
      status: "completed",
      progress: 100,
    });
  }

  /**
   * Mark operation as failed.
   */
  fail(error: string): void {
    this.update({
      status: "failed",
      error,
    });
  }

  /**
   * Mark operation as cancelled.
   */
  cancel(reason?: string): void {
    this.update({
      status: "cancelled",
      error: reason || "Cancelled by user",
    });
  }

  /**
   * Set estimated time of completion.
   */
  setEta(eta: Date): void {
    this.update({
      eta: eta.toISOString(),
    });
  }

  /**
   * Get current state.
   */
  getState(): ProgressState {
    return { ...this.state };
  }

  /**
   * Check if operation is still running.
   */
  isRunning(): boolean {
    return this.state.status === "running";
  }

  private update(partial: Partial<ProgressState>): void {
    this.state = {
      ...this.state,
      ...partial,
      updatedAt: new Date().toISOString(),
    };

    for (const callback of this.callbacks) {
      try {
        callback(this.state);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

/**
 * Format progress state for display.
 */
export function formatProgress(state: ProgressState): string {
  const bar = createProgressBar(state.progress, 30);
  const step = state.currentStep ? ` - ${state.currentStep}` : "";

  return `[${bar}] ${state.progress}% ${state.operation}${step}`;
}

function createProgressBar(percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  return "#".repeat(filled) + "-".repeat(width - filled);
}
