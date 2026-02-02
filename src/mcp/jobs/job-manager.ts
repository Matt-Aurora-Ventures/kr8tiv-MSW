import { randomUUID } from "node:crypto";
import type { Job } from "./types.js";

export class JobManager {
  private jobs: Map<string, Job> = new Map();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 10 * 60 * 1000);
    // Allow process to exit even if timer is active
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  create(tool: string): Job {
    const now = new Date();
    const job: Job = {
      id: randomUUID(),
      tool,
      status: "queued",
      result: undefined,
      error: undefined,
      createdAt: now,
      updatedAt: now,
    };
    this.jobs.set(job.id, job);
    return job;
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  update(id: string, patch: Partial<Job>): void {
    const job = this.jobs.get(id);
    if (!job) return;
    Object.assign(job, patch, { updatedAt: new Date() });
  }

  list(): Job[] {
    return Array.from(this.jobs.values());
  }

  cleanup(ttlMs: number = 3_600_000): void {
    const cutoff = Date.now() - ttlMs;
    for (const [id, job] of this.jobs) {
      if (
        (job.status === "completed" || job.status === "failed") &&
        job.updatedAt.getTime() < cutoff
      ) {
        this.jobs.delete(id);
      }
    }
  }
}

export const jobManager = new JobManager();
