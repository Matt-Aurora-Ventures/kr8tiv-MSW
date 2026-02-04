import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/e2e/**/*.test.ts"],
    testTimeout: 60_000, // E2E tests may take longer
    hookTimeout: 30_000,
    // No coverage for E2E tests - handled by unit tests
    coverage: {
      enabled: false,
    },
    globals: true,
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
  },
});
