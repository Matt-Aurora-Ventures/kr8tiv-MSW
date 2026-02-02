import { z } from "zod/v4";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { existsSync, readFileSync } from "node:fs";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { jobManager } from "../jobs/job-manager.js";
import type { Job } from "../jobs/types.js";

interface MswConfig {
  notebookUrls?: string[];
  [key: string]: unknown;
}

/**
 * Run the research job in the background.
 * Launches browser, navigates to NotebookLM, runs TopicExpansionEngine,
 * persists results via ReportCompiler.
 */
async function runResearchJob(
  jobId: string,
  projectDir: string,
  topic: string,
  notebookUrl: string | undefined,
  options: { maxQueries: number; relevanceThreshold: number },
): Promise<void> {
  jobManager.update(jobId, { status: "running" });

  try {
    // Dynamic imports to allow graceful degradation
    const { BrowserDriver } = await import("../../browser/driver.js");
    const { NotebookNavigator } = await import(
      "../../notebooklm/navigator.js"
    );
    const { TopicExpansionEngine } = await import(
      "../../auto-conversation/index.js"
    );
    const { ReportCompiler } = await import(
      "../../knowledge/report-compiler.js"
    );

    if (!notebookUrl) {
      jobManager.update(jobId, {
        status: "failed",
        error:
          "No notebookUrls configured in .msw/config.json. Add at least one URL.",
      });
      return;
    }

    const driver = new BrowserDriver();

    try {
      // 1. Launch browser
      jobManager.update(jobId, {
        progress: { step: 1, total: 5, message: "Launching browser" },
      });
      await driver.launch();
      const page = await driver.getPage();

      // 2. Navigate to NotebookLM
      jobManager.update(jobId, {
        progress: {
          step: 2,
          total: 5,
          message: `Navigating to ${notebookUrl}`,
        },
      });
      const navigator = new NotebookNavigator(page);
      await navigator.connect(notebookUrl);

      // 3. Run TopicExpansionEngine
      jobManager.update(jobId, {
        progress: {
          step: 3,
          total: 5,
          message: `Running topic expansion (max ${options.maxQueries} queries)`,
        },
      });

      const engine = new TopicExpansionEngine({
        page,
        config: {
          taskGoal: topic,
          currentError: null,
          threshold: options.relevanceThreshold,
          maxLevel: 3,
          maxQueries: options.maxQueries,
          model: "llama3",
        },
      });
      await engine.initialize();
      const result = await engine.run();

      // 4. Persist results via ReportCompiler
      jobManager.update(jobId, {
        progress: { step: 4, total: 5, message: "Persisting research results" },
      });

      const compiler = new ReportCompiler();
      const sessionId = `research-${Date.now()}`;
      const now = new Date();

      // Convert expansion responses to QAPair format
      const pairs: Array<{
        question: string;
        answer: string;
        timestamp: Date;
        source: "auto-expansion";
      }> = [];
      for (const [q, a] of result.responses) {
        pairs.push({
          question: q,
          answer: a,
          timestamp: now,
          source: "auto-expansion",
        });
      }

      const report = {
        sessionId,
        notebook: notebookUrl,
        taskGoal: topic,
        pairs,
        startTime: now,
        endTime: new Date(),
      };

      const markdown = compiler.compile(report);
      const reportPath = compiler.getFilePath(sessionId, projectDir);
      const reportDir = join(projectDir, ".msw", "research", "sessions");
      mkdirSync(reportDir, { recursive: true });
      writeFileSync(reportPath, markdown, "utf-8");

      // 5. Complete
      jobManager.update(jobId, {
        status: "completed",
        progress: { step: 5, total: 5, message: "Research complete" },
        result: {
          topic,
          topicsExpanded: result.topicsExpanded,
          queriesUsed: result.queriesUsed,
          qaPairsExtracted: pairs.length,
          reportPath,
          engineAvailable: true,
        },
      });
    } finally {
      await driver.close();
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown import error";

    if (
      message.includes("Cannot find module") ||
      message.includes("ERR_MODULE_NOT_FOUND")
    ) {
      jobManager.update(jobId, {
        status: "completed",
        result: {
          topic,
          message:
            "Engine modules not yet available at runtime. " +
            "Ensure browser, auto-conversation, and knowledge modules are built.",
          engineAvailable: false,
        },
      });
    } else {
      jobManager.update(jobId, {
        status: "failed",
        error: `Research job failed: ${message}`,
      });
    }
  }
}

/**
 * Register the msw_research tool on the MCP server.
 */
export function registerMswResearch(server: McpServer): void {
  server.tool(
    "msw_research",
    "Trigger NotebookLM research extraction (long-running, returns job ID)",
    {
      projectDir: z
        .string()
        .describe("Project directory with .msw/ config"),
      topic: z.string().describe("Research topic or question to explore"),
      maxQueries: z
        .number()
        .optional()
        .default(20)
        .describe("Maximum queries before stopping"),
      relevanceThreshold: z
        .number()
        .optional()
        .default(60)
        .describe("Minimum relevance score 0-100"),
    },
    async ({ projectDir, topic, maxQueries, relevanceThreshold }) => {
      // Validate .msw/config.json exists
      const configPath = join(projectDir, ".msw", "config.json");
      if (!existsSync(configPath)) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "Project not initialized. Missing .msw/config.json",
                hint: "Run msw_init first to set up the project.",
              }),
            },
          ],
          isError: true,
        };
      }

      // Read config
      let config: MswConfig;
      try {
        config = JSON.parse(readFileSync(configPath, "utf-8")) as MswConfig;
      } catch {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "Failed to parse .msw/config.json",
              }),
            },
          ],
          isError: true,
        };
      }

      // Create job and return immediately
      const job: Job = jobManager.create("msw_research");
      const notebookUrl = config.notebookUrls?.[0];

      // Fire-and-forget the research job
      void runResearchJob(job.id, projectDir, topic, notebookUrl, {
        maxQueries,
        relevanceThreshold,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              jobId: job.id,
              status: "queued",
              topic,
              notebookUrls: config.notebookUrls ?? [],
              pollWith: "msw_status",
            }),
          },
        ],
      };
    },
  );
}
