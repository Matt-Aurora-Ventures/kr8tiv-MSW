import { randomUUID } from "node:crypto";
import { CancellationSource, CancellationToken } from "./cancellation.js";
import { ProgressTracker, type ProgressState, type ProgressCallback } from "./progress.js";
import { SessionStateStore, type SessionState } from "./state-store.js";

export interface Session {
  id: string;
  operation: string;
  progress: ProgressTracker;
  cancellation: CancellationSource;
  context: Record<string, unknown>;
  createdAt: Date;
}

export interface SessionManagerOptions {
  basePath?: string;
  autoSaveIntervalMs?: number;  // How often to persist state
}

/**
 * Session manager for tracking active operations.
 */
export class SessionManager {
  private readonly sessions: Map<string, Session> = new Map();
  private readonly stateStore: SessionStateStore;
  private readonly autoSaveInterval: number;
  private saveTimer?: ReturnType<typeof setInterval>;
  private readonly progressCallbacks: ProgressCallback[] = [];

  constructor(options: SessionManagerOptions = {}) {
    this.stateStore = new SessionStateStore(options.basePath);
    this.autoSaveInterval = options.autoSaveIntervalMs ?? 5000;
  }

  /**
   * Start auto-saving session state.
   */
  startAutoSave(): void {
    if (this.saveTimer) return;

    this.saveTimer = setInterval(() => {
      this.saveAllSessions();
    }, this.autoSaveInterval);
  }

  /**
   * Stop auto-saving session state.
   */
  stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = undefined;
    }
  }

  /**
   * Create and start a new session.
   */
  createSession(operation: string, context: Record<string, unknown> = {}): Session {
    const id = randomUUID();
    const session: Session = {
      id,
      operation,
      progress: new ProgressTracker(id, operation),
      cancellation: new CancellationSource(),
      context,
      createdAt: new Date(),
    };

    // Register progress callback to notify global listeners
    session.progress.onProgress((state) => {
      this.notifyProgress(state);
      this.saveSession(session);
    });

    this.sessions.set(id, session);
    this.saveSession(session);

    return session;
  }

  /**
   * Get a session by ID.
   */
  getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  /**
   * Get all active sessions.
   */
  getActiveSessions(): Session[] {
    return Array.from(this.sessions.values()).filter(
      (s) => s.progress.isRunning()
    );
  }

  /**
   * Get all sessions (including completed).
   */
  getAllSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Cancel a session.
   */
  cancelSession(id: string, reason?: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;

    session.cancellation.cancel(reason);
    session.progress.cancel(reason);
    this.saveSession(session);

    return true;
  }

  /**
   * Complete a session.
   */
  completeSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;

    session.progress.complete();
    this.saveSession(session);
    this.sessions.delete(id);

    return true;
  }

  /**
   * Fail a session.
   */
  failSession(id: string, error: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;

    session.progress.fail(error);
    this.saveSession(session);
    this.sessions.delete(id);

    return true;
  }

  /**
   * Register callback for progress updates from any session.
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Find sessions that crashed (for resumption).
   */
  findCrashedSessions(): SessionState[] {
    return this.stateStore.findCrashedSessions();
  }

  /**
   * Resume a crashed session.
   */
  resumeSession(crashedState: SessionState): Session | undefined {
    // Create new session with same ID and context
    const session: Session = {
      id: crashedState.id,
      operation: crashedState.operation,
      progress: new ProgressTracker(crashedState.id, crashedState.operation),
      cancellation: new CancellationSource(),
      context: crashedState.context,
      createdAt: new Date(crashedState.createdAt),
    };

    // Restore progress state
    session.progress.start(crashedState.progress.totalSteps);
    session.progress.setProgress(
      crashedState.progress.progress,
      crashedState.progress.currentStep
    );

    // Register progress callback
    session.progress.onProgress((state) => {
      this.notifyProgress(state);
      this.saveSession(session);
    });

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Clean up old session state files.
   */
  cleanup(maxAgeDays?: number): number {
    return this.stateStore.cleanup(maxAgeDays);
  }

  /**
   * Save all sessions to disk.
   */
  saveAllSessions(): void {
    for (const session of this.sessions.values()) {
      this.saveSession(session);
    }
  }

  /**
   * Shutdown: stop auto-save and save all sessions.
   */
  shutdown(): void {
    this.stopAutoSave();
    this.saveAllSessions();
  }

  private saveSession(session: Session): void {
    const state: SessionState = {
      id: session.id,
      operation: session.operation,
      status: session.progress.isRunning() ? "active" : "completed",
      progress: session.progress.getState(),
      context: session.context,
      createdAt: session.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.stateStore.save(state);
  }

  private notifyProgress(state: ProgressState): void {
    for (const callback of this.progressCallbacks) {
      try {
        callback(state);
      } catch {
        // Ignore callback errors
      }
    }
  }
}

// Singleton instance
let globalManager: SessionManager | undefined;

/**
 * Get the global session manager instance.
 */
export function getSessionManager(): SessionManager {
  if (!globalManager) {
    globalManager = new SessionManager();
  }
  return globalManager;
}
