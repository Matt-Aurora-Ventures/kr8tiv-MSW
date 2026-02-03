import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html", "lcov"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/index.ts", // Barrel exports
        "src/types/**", // Type definitions
      ],
      thresholds: {
        // Global thresholds
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
        // Per-module thresholds for critical paths (80%+)
        "src/auth/**/*.ts": {
          lines: 80,
          functions: 80,
          branches: 75,
        },
        "src/backup/**/*.ts": {
          lines: 80,
          functions: 80,
          branches: 75,
        },
        "src/config/**/*.ts": {
          lines: 80,
          functions: 80,
          branches: 75,
        },
        "src/common/degradation.ts": {
          lines: 80,
          functions: 80,
          branches: 75,
        },
        "src/browser/driver.ts": {
          lines: 85,
          functions: 85,
        },
        "src/mcp/tools/**/*.ts": {
          lines: 80,
          functions: 80,
        },
      },
    },
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
  },
});
