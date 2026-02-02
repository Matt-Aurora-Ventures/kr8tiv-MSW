import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { writeFile, mkdir, access } from "node:fs/promises";
import { join } from "node:path";
import { jobManager } from "../jobs/job-manager.js";
import type { ToolResult } from "../jobs/types.js";

export function registerMswExecute(server: McpServer): void {
  server.tool(
    "msw_execute",
    "Run Ralph execution loop with NotebookLM feedback (long-running, returns job ID)",
    {
      projectDir: z.string().describe("Project directory with .msw/ config"),
      taskDescription: z.string().describe("What to implement"),
      maxIterations: z.number().optional().default(5).describe("Maximum Ralph loop iterations"),
      completionPromise: z.string().optional().default("TASK_COMPLETE").describe("String that signals completion"),
      verifyCommands: z.array(z.string()).optional().default([]).describe("Commands to run for verification"),
    },
    async ({ projectDir, taskDescription, maxIterations, completionPromise, verifyCommands }): Promise<ToolResult> => {
      const mswDir = join(projectDir, ".msw");

      try {
        await access(mswDir);
      } catch {
        return {
          content: [{ type: "text", text: `Error: .msw/ directory not found in ${projectDir}` }],
          isError: true,
        };
      }

      const job = jobManager.create("msw_execute");
      const iterations = maxIterations ?? 5;

      // Run in background
      void (async () => {
        try {
          jobManager.update(job.id, { status: "running" });

          const executionDir = join(mswDir, "execution");
          await mkdir(executionDir, { recursive: true });

          // Try to wire real Ralph loop engines
          let useRealEngines = false;
          let tracker: import("../../execution/iteration-tracker.js").IterationTracker | null = null;
          let completionDetector: import("../../execution/completion-detector.js").CompletionDetector | null = null;

          try {
            const { IterationTracker } = await import("../../execution/iteration-tracker.js");
            const { CompletionDetector } = await import("../../execution/completion-detector.js");

            tracker = new IterationTracker(projectDir);
            tracker.init({
              prompt: taskDescription,
              completionPromise: completionPromise ?? "TASK_COMPLETE",
              maxIterations: iterations,
              taskContext: {
                phase: "execute",
                planId: job.id,
                description: taskDescription,
              },
            });

            completionDetector = new CompletionDetector(completionPromise ?? "TASK_COMPLETE");
            useRealEngines = true;
          } catch {
            // Engines not available -- fall back to stub iteration
          }

          const logs: string[] = [];
          const transcriptPath = join(executionDir, "transcript.md");

          for (let i = 1; i <= iterations; i++) {
            jobManager.update(job.id, {
              progress: {
                step: i,
                total: iterations,
                message: `Ralph loop iteration ${i}/${iterations}${useRealEngines ? "" : " (stub)"}`,
              },
            });

            if (useRealEngines && tracker) {
              // Real Ralph loop: increment tracker, check completion
              const iterResult = tracker.increment();

              const iterationLog = [
                `# Iteration ${i}`,
                `Timestamp: ${new Date().toISOString()}`,
                `Task: ${taskDescription}`,
                `Status: ${iterResult}`,
                "",
              ].join("\n");

              logs.push(iterationLog);
              await writeFile(join(executionDir, `iteration-${i}.md`), iterationLog, "utf-8");

              // Append to transcript for completion detection
              await writeFile(transcriptPath, logs.join("\n---\n"), "utf-8");

              // Check completion via CompletionDetector
              if (completionDetector && (verifyCommands ?? []).length > 0) {
                const check = completionDetector.checkWithVerification(
                  transcriptPath,
                  verifyCommands ?? [],
                );
                if (check.complete) {
                  jobManager.update(job.id, {
                    status: "completed",
                    progress: { step: i, total: iterations, message: "Completion detected" },
                    result: {
                      iterationsRun: i,
                      taskDescription,
                      executionDir,
                      completedEarly: true,
                      verifyResults: check.verifyResults,
                    },
                  });
                  return;
                }
              }

              if (iterResult !== "continue") {
                jobManager.update(job.id, {
                  status: "completed",
                  progress: { step: i, total: iterations, message: `Stopped: ${iterResult}` },
                  result: {
                    iterationsRun: i,
                    taskDescription,
                    executionDir,
                    stoppedReason: iterResult,
                  },
                });
                return;
              }
            } else {
              // Stub iteration
              const iterationLog = [
                `# Iteration ${i}`,
                `Timestamp: ${new Date().toISOString()}`,
                `Task: ${taskDescription}`,
                `Status: stub iteration (execution engines not available)`,
                "",
              ].join("\n");

              logs.push(iterationLog);
              await writeFile(join(executionDir, `iteration-${i}.md`), iterationLog, "utf-8");
            }
          }

          jobManager.update(job.id, {
            status: "completed",
            progress: {
              step: iterations,
              total: iterations,
              message: "Ralph loop complete",
            },
            result: {
              iterationsRun: iterations,
              taskDescription,
              executionDir,
              realEngines: useRealEngines,
            },
          });
        } catch (err) {
          jobManager.update(job.id, {
            status: "failed",
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })();

      return {
        content: [{ type: "text", text: JSON.stringify({ jobId: job.id, status: "queued" }) }],
      };
    },
  );
}
