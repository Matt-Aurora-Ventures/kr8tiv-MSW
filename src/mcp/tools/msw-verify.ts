import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readdir, access } from "node:fs/promises";
import { join } from "node:path";

export function registerMswVerify(server: McpServer): void {
  server.tool(
    "msw_verify",
    "Verify implementation against research requirements",
    {
      projectDir: z.string().describe("Project directory with .msw/ config"),
      requirementIds: z
        .array(z.string())
        .optional()
        .describe("Specific requirement IDs to verify (all if omitted)"),
      commands: z
        .array(z.string())
        .optional()
        .describe("Verification commands to run (e.g. test commands)"),
      expectedOutputPatterns: z
        .record(z.string(), z.string())
        .optional()
        .describe("Map of command -> regex pattern to match in stdout"),
      timeoutMs: z
        .number()
        .optional()
        .describe("Timeout per command in ms (default 30000)"),
    },
    async ({ projectDir, requirementIds, commands, expectedOutputPatterns, timeoutMs }) => {
      try {
        const mswDir = join(projectDir, ".msw");
        await access(mswDir);

        const researchDir = join(mswDir, "research");
        let files: string[] = [];
        try {
          files = await readdir(researchDir);
        } catch {
          // research directory may not exist yet
        }

        const requirements = requirementIds
          ? files.filter((f) => requirementIds.some((id) => f.includes(id)))
          : files;

        // If commands provided, run BehavioralVerifier
        if (commands && commands.length > 0) {
          try {
            const { BehavioralVerifier } = await import(
              "../../execution/behavioral-verifier.js"
            );

            const verifier = new BehavioralVerifier();
            const result = verifier.verify({
              commands,
              expectedOutputPatterns,
              timeoutMs,
            });

            return {
              content: [
                {
                  type: "text" as const,
                  text: JSON.stringify(
                    {
                      total: requirements.length,
                      verified: result.results.filter((r) => r.passed).length,
                      pending: requirements.length - result.results.filter((r) => r.passed).length,
                      requirements,
                      verification: {
                        passed: result.passed,
                        results: result.results,
                      },
                    },
                    null,
                    2,
                  ),
                },
              ],
            };
          } catch {
            // BehavioralVerifier not available, fall back to basic summary
          }
        }

        // Fallback: basic file-based summary (no commands or verifier unavailable)
        const summary = {
          total: requirements.length,
          verified: 0,
          pending: requirements.length,
          requirements,
          note: commands
            ? "BehavioralVerifier not available. Provide built execution module."
            : "No verification commands provided. Pass commands[] for behavioral verification.",
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: `.msw/ directory not found in ${projectDir}. Run msw_init first.`,
            },
          ],
        };
      }
    },
  );
}
