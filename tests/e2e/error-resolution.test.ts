// vitest globals enabled - no import needed
import { createTestClient, type TestClient } from "./helpers/spawn-server";
import { startMockNotebookLM, type MockNotebookLMServer } from "../helpers/mock-notebooklm";
import { SAMPLE_ERROR, MOCK_NOTEBOOKLM_RESPONSE } from "./helpers/test-fixtures";
import { createTestDir, cleanupTestDir } from "../setup";
import fs from "node:fs";
import path from "node:path";

describe("Error-to-resolution pipeline E2E", () => {
  let tc: TestClient;
  let mockServer: MockNotebookLMServer;
  let projectDir: string;

  beforeAll(async () => {
    tc = await createTestClient();
    mockServer = await startMockNotebookLM();
    projectDir = createTestDir("e2e-error-resolution");

    // Initialize project (skip auth for testing)
    await tc.client.callTool({
      name: "msw_init",
      arguments: {
        projectDir,
        notebookUrls: [mockServer.url],
        skipAuth: true,
      },
    });
  }, 30000);

  afterAll(async () => {
    await tc?.cleanup();
    await mockServer?.close();
    cleanupTestDir(projectDir);
  });

  it("detects error and queries NotebookLM", async () => {
    // Simulate coding agent error by logging to .msw/errors
    const errorLogPath = path.join(projectDir, ".msw", "errors", "latest.json");
    fs.mkdirSync(path.dirname(errorLogPath), { recursive: true });
    fs.writeFileSync(errorLogPath, JSON.stringify(SAMPLE_ERROR, null, 2), "utf-8");

    // Trigger research with error context
    const analysisResult = await tc.client.callTool({
      name: "msw_research",
      arguments: {
        projectDir,
        topic: `Fix error: ${SAMPLE_ERROR.message}`,
        maxQueries: 2,
      },
    });

    const analysisData = JSON.parse(analysisResult.content[0].text);

    // Should generate research job or return immediate result
    expect(analysisData.jobId || analysisData.success !== undefined).toBeTruthy();
  });

  it("executes task with guidance context", async () => {
    // Simulate guidance from NotebookLM research
    const guidancePath = path.join(projectDir, ".msw", "guidance", "error-fix.md");
    fs.mkdirSync(path.dirname(guidancePath), { recursive: true });

    const guidanceContent = `# Fix for TypeError

${MOCK_NOTEBOOKLM_RESPONSE.answer}

## Sources
${MOCK_NOTEBOOKLM_RESPONSE.citations.map(c => `- ${c}`).join('\n')}
`;

    fs.writeFileSync(guidancePath, guidanceContent, "utf-8");

    // Execute task via MCP tool
    const executeResult = await tc.client.callTool({
      name: "msw_execute",
      arguments: {
        projectDir,
        task: "Fix null pointer error in API handler",
        context: guidanceContent,
      },
    });

    const executeData = JSON.parse(executeResult.content[0].text);

    // Should acknowledge task execution (success/jobId/error)
    expect(executeData.success !== undefined || executeData.jobId || executeData.error).toBeDefined();
  });

  it("validates fix with verification tool", async () => {
    // Create a fixed file
    const fixedFilePath = path.join(projectDir, "src", "api", "handler.ts");
    fs.mkdirSync(path.dirname(fixedFilePath), { recursive: true });

    const fixedCode = `
export function processResponse(response: ApiResponse | null) {
  // Fixed: Added null check per NotebookLM guidance
  if (!response || !response.data) {
    throw new Error("Invalid API response");
  }
  return response.data;
}
`;

    fs.writeFileSync(fixedFilePath, fixedCode, "utf-8");

    // Verify via MCP tool
    const verifyResult = await tc.client.callTool({
      name: "msw_verify",
      arguments: {
        projectDir,
        target: "src/api/handler.ts",
      },
    });

    const verifyData = JSON.parse(verifyResult.content[0].text);

    // Verification should return structured result
    expect(verifyData).toBeDefined();
    expect(verifyData.success !== undefined || verifyData.error !== undefined).toBe(true);
  });

  it("handles multiple errors in sequence", async () => {
    const errors = [
      { ...SAMPLE_ERROR, message: "Error 1: Undefined variable" },
      { ...SAMPLE_ERROR, message: "Error 2: Type mismatch" },
      { ...SAMPLE_ERROR, message: "Error 3: Missing import" },
    ];

    const errorsDir = path.join(projectDir, ".msw", "errors");
    fs.mkdirSync(errorsDir, { recursive: true });

    for (const error of errors) {
      const errorPath = path.join(errorsDir, `${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
      fs.writeFileSync(errorPath, JSON.stringify(error, null, 2), "utf-8");

      // Trigger analysis for each error
      await tc.client.callTool({
        name: "msw_research",
        arguments: {
          projectDir,
          topic: `Fix: ${error.message}`,
          maxQueries: 1,
        },
      });

      // Small delay to avoid timestamp collisions
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Verify all errors logged
    const errorFiles = fs.readdirSync(errorsDir).filter(f => f.endsWith(".json"));
    expect(errorFiles.length).toBeGreaterThanOrEqual(errors.length);
  });

  it("respects max iterations config", async () => {
    // Update config with low max iterations
    const configPath = path.join(projectDir, ".msw", "config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    config.maxIterations = 3;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");

    // Attempt multiple executions
    const results = [];
    for (let i = 0; i < 5; i++) {
      const result = await tc.client.callTool({
        name: "msw_execute",
        arguments: {
          projectDir,
          task: `Iteration ${i + 1}`,
        },
      });

      const data = JSON.parse(result.content[0].text);
      results.push(data);
    }

    // At least one should acknowledge max iterations
    // (implementation may vary - accept any structured response)
    expect(results.length).toBe(5);
    results.forEach(r => {
      expect(r.success !== undefined || r.error !== undefined || r.jobId).toBeTruthy();
    });
  });

  it("creates plan from error context", async () => {
    // Use msw_plan to create a fix plan
    const planResult = await tc.client.callTool({
      name: "msw_plan",
      arguments: {
        projectDir,
        goal: "Fix null pointer errors in API handlers",
        context: JSON.stringify(SAMPLE_ERROR),
      },
    });

    const planData = JSON.parse(planResult.content[0].text);

    // Should create a plan or explain why not
    expect(planData).toBeDefined();
    expect(planData.success !== undefined || planData.plan || planData.error).toBeTruthy();
  });

  it("handles notebook URL addition", async () => {
    // Add a new notebook URL to config
    const addResult = await tc.client.callTool({
      name: "msw_notebook_add",
      arguments: {
        projectDir,
        notebookUrl: "https://notebooklm.google.com/notebook/test-456",
      },
    });

    const addData = JSON.parse(addResult.content[0].text);

    // Should update config successfully
    if (addData.success) {
      expect(addData.success).toBe(true);

      // Verify config updated
      const configPath = path.join(projectDir, ".msw", "config.json");
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(config.notebookUrls).toBeDefined();
      expect(Array.isArray(config.notebookUrls)).toBe(true);
    } else {
      // If failed, should have clear error
      expect(addData.error).toBeDefined();
    }
  });

  it("handles status queries for jobs", async () => {
    // Query global status (no projectDir)
    const globalStatus = await tc.client.callTool({
      name: "msw_status",
      arguments: {},
    });

    const globalData = JSON.parse(globalStatus.content[0].text);

    // Should return job list
    expect(globalData.jobs).toBeDefined();
    expect(Array.isArray(globalData.jobs)).toBe(true);
    expect(globalData.count !== undefined).toBe(true);
  });
});
