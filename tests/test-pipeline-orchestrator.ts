/**
 * Tests for PipelineOrchestrator - startup lifecycle with health, config, and crash recovery.
 * Run: npx tsx tests/test-pipeline-orchestrator.ts
 */
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { PipelineOrchestrator } from "../src/pipeline/orchestrator.js";

let tmpDir: string;
let passCount = 0;
let failCount = 0;

function setup(): string {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "msw-orch-test-"));
  return tmpDir;
}

function teardown(): void {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function test(name: string, fn: () => Promise<void> | void) {
  const dir = setup();
  try {
    await fn();
    console.log(`PASS: ${name}`);
    passCount++;
  } catch (e: any) {
    console.error(`FAIL: ${name}`);
    console.error(e.message);
    failCount++;
  } finally {
    teardown();
  }
}

function writeConfig(projectDir: string, config: Record<string, unknown>): void {
  const mswDir = path.join(projectDir, ".msw");
  fs.mkdirSync(mswDir, { recursive: true });
  fs.writeFileSync(path.join(mswDir, "config.json"), JSON.stringify(config));
}

function writeState(projectDir: string, state: Record<string, unknown>): void {
  const mswDir = path.join(projectDir, ".msw");
  fs.mkdirSync(mswDir, { recursive: true });
  fs.writeFileSync(path.join(mswDir, "state.json"), JSON.stringify(state));
}

// --- Tests ---

await test("constructor creates instance with projectDir", () => {
  const orch = new PipelineOrchestrator(tmpDir);
  assert.ok(orch, "Should create orchestrator instance");
});

await test("initialize throws on missing config", async () => {
  const orch = new PipelineOrchestrator(tmpDir);
  await assert.rejects(() => orch.initialize(), /config not found|config.json/i);
});

await test("initialize throws on invalid config", async () => {
  writeConfig(tmpDir, { notebookUrl: "not-a-url" });
  const orch = new PipelineOrchestrator(tmpDir);
  await assert.rejects(() => orch.initialize(), /invalid/i);
});

await test("initialize succeeds with valid config", async () => {
  writeConfig(tmpDir, { notebookUrl: "https://notebooklm.google.com/notebook/abc" });
  const orch = new PipelineOrchestrator(tmpDir);
  const result = await orch.initialize();
  assert.ok(result.config, "Should have config");
  assert.ok(Array.isArray(result.health), "Should have health array");
  assert.strictEqual(result.resumed, false, "Should not be resumed");
});

await test("initialize returns health checks", async () => {
  writeConfig(tmpDir, { notebookUrl: "https://notebooklm.google.com/notebook/abc" });
  const orch = new PipelineOrchestrator(tmpDir);
  const result = await orch.initialize();
  assert.ok(result.health.length > 0, "Should have at least one health check");
  for (const check of result.health) {
    assert.ok(typeof check.component === "string");
    assert.ok(typeof check.healthy === "boolean");
  }
});

await test("initialize detects crash recovery from existing state", async () => {
  writeConfig(tmpDir, { notebookUrl: "https://notebooklm.google.com/notebook/abc" });
  writeState(tmpDir, {
    sessionId: "test-session",
    phase: "researching",
    pendingQueries: ["q1"],
    completedQA: [],
    lastCheckpoint: new Date().toISOString(),
  });
  const orch = new PipelineOrchestrator(tmpDir);
  const result = await orch.initialize();
  assert.strictEqual(result.resumed, true, "Should detect resumed state");
  assert.strictEqual(result.state.phase, "researching");
  assert.strictEqual(result.state.sessionId, "test-session");
});

await test("initialize ignores state with idle phase", async () => {
  writeConfig(tmpDir, { notebookUrl: "https://notebooklm.google.com/notebook/abc" });
  writeState(tmpDir, {
    sessionId: "old-session",
    phase: "idle",
    pendingQueries: [],
    completedQA: [],
    lastCheckpoint: new Date().toISOString(),
  });
  const orch = new PipelineOrchestrator(tmpDir);
  const result = await orch.initialize();
  assert.strictEqual(result.resumed, false, "Should not resume from idle state");
});

await test("checkpoint saves state to disk", async () => {
  writeConfig(tmpDir, { notebookUrl: "https://notebooklm.google.com/notebook/abc" });
  const orch = new PipelineOrchestrator(tmpDir);
  await orch.initialize();
  await orch.checkpoint({
    sessionId: "s1",
    phase: "executing",
    pendingQueries: [],
    completedQA: [{ question: "q", answer: "a" }],
    lastCheckpoint: new Date().toISOString(),
  });
  const stateFile = path.join(tmpDir, ".msw", "state.json");
  assert.ok(fs.existsSync(stateFile), "State file should exist after checkpoint");
  const saved = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
  assert.strictEqual(saved.phase, "executing");
});

await test("complete clears state file", async () => {
  writeConfig(tmpDir, { notebookUrl: "https://notebooklm.google.com/notebook/abc" });
  writeState(tmpDir, {
    sessionId: "s1",
    phase: "researching",
    pendingQueries: [],
    completedQA: [],
    lastCheckpoint: new Date().toISOString(),
  });
  const orch = new PipelineOrchestrator(tmpDir);
  await orch.initialize();
  await orch.complete();
  const stateFile = path.join(tmpDir, ".msw", "state.json");
  assert.ok(!fs.existsSync(stateFile), "State file should be removed after complete");
});

await test("getHealth returns cached health results after init", async () => {
  writeConfig(tmpDir, { notebookUrl: "https://notebooklm.google.com/notebook/abc" });
  const orch = new PipelineOrchestrator(tmpDir);
  await orch.initialize();
  const health = orch.getHealth();
  assert.ok(Array.isArray(health), "getHealth should return array");
  assert.ok(health.length > 0);
});

await test("getDegradedCapabilities returns degraded items", async () => {
  writeConfig(tmpDir, { notebookUrl: "https://notebooklm.google.com/notebook/abc" });
  const orch = new PipelineOrchestrator(tmpDir);
  await orch.initialize();
  const degraded = orch.getDegradedCapabilities();
  assert.ok(Array.isArray(degraded), "Should return array of strings");
});

// Summary
console.log(`\n--- Results: ${passCount} passed, ${failCount} failed ---`);
if (failCount > 0) process.exitCode = 1;
