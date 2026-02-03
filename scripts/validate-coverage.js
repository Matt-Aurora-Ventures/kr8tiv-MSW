#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const coveragePath = path.join(__dirname, "../coverage/coverage-summary.json");

if (!fs.existsSync(coveragePath)) {
  console.error("❌ Coverage report not found");
  process.exit(1);
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, "utf-8"));

// Critical paths requiring 80%+ coverage
const criticalPaths = [
  "src/auth/",
  "src/backup/",
  "src/config/",
  "src/common/degradation.ts",
  "src/browser/driver.ts",
  "src/mcp/tools/",
];

let passed = true;

console.log("\n📊 Coverage Validation\n");

for (const [file, metrics] of Object.entries(coverage)) {
  if (file === "total") continue;

  const isCritical = criticalPaths.some((p) => file.includes(p));

  if (isCritical) {
    const lines = metrics.lines.pct;
    const functions = metrics.functions.pct;
    const threshold = file.includes("browser/driver.ts") ? 85 : 80;

    if (lines < threshold || functions < threshold) {
      console.error(
        `❌ ${file}: Lines ${lines}%, Functions ${functions}% (expected ${threshold}%+)`
      );
      passed = false;
    } else {
      console.log(
        `✅ ${file}: Lines ${lines}%, Functions ${functions}%`
      );
    }
  }
}

const total = coverage.total;
console.log(`\n📈 Total Coverage: Lines ${total.lines.pct}%, Functions ${total.functions.pct}%, Branches ${total.branches.pct}%\n`);

if (!passed) {
  console.error("❌ Coverage validation failed\n");
  process.exit(1);
}

console.log("✅ Coverage validation passed\n");
