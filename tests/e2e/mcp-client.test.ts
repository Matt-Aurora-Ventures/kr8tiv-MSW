// vitest globals enabled - no import needed
import { createTestClient, type TestClient } from "./helpers/spawn-server.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("MCP E2E smoke tests", () => {
  let tc: TestClient;
  let projectDir: string;

  beforeAll(async () => {
    tc = await createTestClient();
    projectDir = path.join(
      os.tmpdir(),
      `msw-e2e-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    );
    fs.mkdirSync(projectDir, { recursive: true });
  });

  afterAll(async () => {
    await tc?.cleanup();
    if (projectDir && fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
  });

  it("server lists all 7 tools", async () => {
    const result = await tc.client.listTools();
    const names = result.tools.map((t) => t.name);
    expect(names).toContain("msw_init");
    expect(names).toContain("msw_research");
    expect(names).toContain("msw_plan");
    expect(names).toContain("msw_execute");
    expect(names).toContain("msw_verify");
    expect(names).toContain("msw_status");
    expect(names).toContain("msw_notebook_add");
    expect(result.tools.length).toBeGreaterThanOrEqual(7);
  });

  it("msw_init creates config", async () => {
    const result = await tc.client.callTool({
      name: "msw_init",
      arguments: { projectDir, skipAuth: true },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    const data = JSON.parse(text);
    expect(data.success).toBe(true);

    const configPath = path.join(projectDir, ".msw", "config.json");
    expect(fs.existsSync(configPath)).toBe(true);

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    expect(config.version).toBe("0.1.0");
  });

  it("msw_status returns status after init", async () => {
    const result = await tc.client.callTool({
      name: "msw_status",
      arguments: { projectDir },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    const data = JSON.parse(text);
    expect(data.projectDir).toBe(projectDir);
    expect(data.config).toBeDefined();
    expect(data.config.version).toBe("0.1.0");
  });

  it("msw_status without project returns job list", async () => {
    const result = await tc.client.callTool({
      name: "msw_status",
      arguments: {},
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0]
      .text;
    const data = JSON.parse(text);
    expect(data).toHaveProperty("jobs");
    expect(data).toHaveProperty("count");
  });
});
