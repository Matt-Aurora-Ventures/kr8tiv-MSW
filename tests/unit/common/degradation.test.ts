// vitest globals enabled - no import needed
import { DegradationHandler } from "../../../src/common/degradation.js";

describe("DegradationHandler", () => {
  let handler: DegradationHandler;

  beforeEach(() => {
    handler = new DegradationHandler();
  });

  describe("withFallbacks", () => {
    it("uses primary when it succeeds", async () => {
      const primary = vi.fn().mockResolvedValue("primary-value");
      const fallback = vi.fn().mockResolvedValue("fallback-value");

      const { result, context } = await handler.withFallbacks("test-operation", [
        { name: "primary", fn: primary },
        { name: "fallback", fn: fallback },
      ]);

      expect(primary).toHaveBeenCalled();
      expect(fallback).not.toHaveBeenCalled();
      expect(result).toBe("primary-value");
      expect(context.successful).toBe("primary");
      expect(context.userMessage).toContain("completed successfully");
    });

    it("falls back when primary fails", async () => {
      const primary = vi.fn().mockRejectedValue(new Error("primary failed"));
      const fallback = vi.fn().mockResolvedValue("fallback-value");

      const { result, context } = await handler.withFallbacks("test-operation", [
        { name: "primary", fn: primary },
        { name: "fallback", fn: fallback },
      ]);

      expect(primary).toHaveBeenCalled();
      expect(fallback).toHaveBeenCalled();
      expect(result).toBe("fallback-value");
      expect(context.successful).toBe("fallback");
      expect(context.userMessage).toContain("fallback");
      expect(context.attempted).toEqual(["primary", "fallback"]);
    });

    it("returns context with no result when all attempts fail", async () => {
      const primary = vi.fn().mockRejectedValue(new Error("primary failed"));
      const fallback = vi.fn().mockRejectedValue(new Error("fallback failed"));

      const { result, context } = await handler.withFallbacks("test-operation", [
        { name: "primary", fn: primary },
        { name: "fallback", fn: fallback },
      ]);

      expect(result).toBeUndefined();
      expect(context.successful).toBeUndefined();
      expect(context.userMessage).toContain("failed");
      expect(context.attempted).toEqual(["primary", "fallback"]);
    });

    it("tries all fallbacks in sequence", async () => {
      const attempt1 = vi.fn().mockRejectedValue(new Error("fail1"));
      const attempt2 = vi.fn().mockRejectedValue(new Error("fail2"));
      const attempt3 = vi.fn().mockResolvedValue("success");

      const { result, context } = await handler.withFallbacks("multi-fallback", [
        { name: "attempt1", fn: attempt1 },
        { name: "attempt2", fn: attempt2 },
        { name: "attempt3", fn: attempt3 },
      ]);

      expect(attempt1).toHaveBeenCalled();
      expect(attempt2).toHaveBeenCalled();
      expect(attempt3).toHaveBeenCalled();
      expect(result).toBe("success");
      expect(context.successful).toBe("attempt3");
    });
  });

  describe("getDegradationLevel", () => {
    it("returns 'full' when no operations have been performed", () => {
      const level = handler.getDegradationLevel();
      expect(level).toBe("full");
    });

    it("returns 'degraded' when using fallbacks", async () => {
      // Simulate fallback usage
      await handler.withFallbacks("test", [
        { name: "primary", fn: async () => { throw new Error("fail"); } },
        { name: "fallback", fn: async () => "success" },
      ]);

      const level = handler.getDegradationLevel();
      expect(level).toBe("degraded");
    });

    it("returns 'failed' when all recent operations fail", async () => {
      // Simulate 5 consecutive failures
      for (let i = 0; i < 5; i++) {
        await handler.withFallbacks(`fail-${i}`, [
          { name: "attempt", fn: async () => { throw new Error("fail"); } },
        ]);
      }

      const level = handler.getDegradationLevel();
      expect(level).toBe("failed");
    });

    it("returns 'minimal' when more than half of operations fail", async () => {
      // 3 failures, 2 successes
      await handler.withFallbacks("op1", [
        { name: "fail", fn: async () => { throw new Error("fail"); } },
      ]);
      await handler.withFallbacks("op2", [
        { name: "success", fn: async () => "ok" },
      ]);
      await handler.withFallbacks("op3", [
        { name: "fail", fn: async () => { throw new Error("fail"); } },
      ]);
      await handler.withFallbacks("op4", [
        { name: "success", fn: async () => "ok" },
      ]);
      await handler.withFallbacks("op5", [
        { name: "fail", fn: async () => { throw new Error("fail"); } },
      ]);

      const level = handler.getDegradationLevel();
      expect(level).toBe("minimal");
    });

    it("returns 'full' when all operations succeed without fallbacks", async () => {
      // 5 successful operations
      for (let i = 0; i < 5; i++) {
        await handler.withFallbacks(`success-${i}`, [
          { name: "primary", fn: async () => "success" },
        ]);
      }

      const level = handler.getDegradationLevel();
      expect(level).toBe("full");
    });
  });

  describe("getSummary", () => {
    it("returns default summary when no operations performed", () => {
      const summary = handler.getSummary();

      expect(summary.level).toBe("full");
      expect(summary.successRate).toBe(1.0);
      expect(summary.fallbackRate).toBe(0);
      expect(summary.recentFailures).toEqual([]);
    });

    it("calculates success rate correctly", async () => {
      // 2 successes, 1 failure
      await handler.withFallbacks("op1", [
        { name: "success", fn: async () => "ok" },
      ]);
      await handler.withFallbacks("op2", [
        { name: "success", fn: async () => "ok" },
      ]);
      await handler.withFallbacks("op3", [
        { name: "fail", fn: async () => { throw new Error("fail"); } },
      ]);

      const summary = handler.getSummary();

      expect(summary.successRate).toBeCloseTo(2 / 3);
      expect(summary.recentFailures).toContain("op3");
    });

    it("calculates fallback rate correctly", async () => {
      // 1 successful with fallback, 1 successful without fallback
      await handler.withFallbacks("op1", [
        { name: "primary", fn: async () => { throw new Error("fail"); } },
        { name: "fallback", fn: async () => "ok" },
      ]);
      await handler.withFallbacks("op2", [
        { name: "primary", fn: async () => "ok" },
      ]);

      const summary = handler.getSummary();

      expect(summary.fallbackRate).toBe(0.5);
    });

    it("tracks recent failures (last 10)", async () => {
      // Create 12 operations (10 failures + 2 successes)
      for (let i = 0; i < 10; i++) {
        await handler.withFallbacks(`fail-${i}`, [
          { name: "attempt", fn: async () => { throw new Error("fail"); } },
        ]);
      }
      for (let i = 0; i < 2; i++) {
        await handler.withFallbacks(`success-${i}`, [
          { name: "attempt", fn: async () => "ok" },
        ]);
      }

      const summary = handler.getSummary();

      // Should only include last 10 operations
      expect(summary.recentFailures.length).toBeLessThanOrEqual(10);
    });
  });

  describe("getStatusMessage", () => {
    it("returns success message when all operations succeed", async () => {
      await handler.withFallbacks("test", [
        { name: "primary", fn: async () => "ok" },
      ]);

      const message = handler.getStatusMessage();
      expect(message).toContain("operational");
    });

    it("returns degraded message when using fallbacks", async () => {
      await handler.withFallbacks("test", [
        { name: "primary", fn: async () => { throw new Error("fail"); } },
        { name: "fallback", fn: async () => "ok" },
      ]);

      const message = handler.getStatusMessage();
      expect(message).toContain("degraded");
    });

    it("returns failure message when all operations fail", async () => {
      for (let i = 0; i < 5; i++) {
        await handler.withFallbacks(`fail-${i}`, [
          { name: "attempt", fn: async () => { throw new Error("fail"); } },
        ]);
      }

      const message = handler.getStatusMessage();
      expect(message).toContain("unavailable");
    });
  });

  describe("reset", () => {
    it("clears context history", async () => {
      // Add operations that cause degradation (use fallback)
      await handler.withFallbacks("test", [
        { name: "primary", fn: async () => { throw new Error("fail"); } },
        { name: "fallback", fn: async () => "ok" },
      ]);

      // Should be degraded due to fallback usage
      expect(handler.getDegradationLevel()).toBe("degraded");

      handler.reset();

      // After reset, should be back to full
      expect(handler.getDegradationLevel()).toBe("full");
      const summary = handler.getSummary();
      expect(summary.recentFailures).toEqual([]);
    });
  });

  describe("message generation", () => {
    it("generates success message without fallback mention", async () => {
      const { context } = await handler.withFallbacks("test-op", [
        { name: "primary", fn: async () => "success" },
      ]);

      expect(context.userMessage).toContain("completed successfully");
      expect(context.userMessage).not.toContain("fallback");
    });

    it("generates success message with fallback mention", async () => {
      const { context } = await handler.withFallbacks("test-op", [
        { name: "primary", fn: async () => { throw new Error("fail"); } },
        { name: "fallback", fn: async () => "success" },
      ]);

      expect(context.userMessage).toContain("fallback");
      expect(context.userMessage).toContain("operational");
    });

    it("generates failure message with attempted list", async () => {
      const { context } = await handler.withFallbacks("test-op", [
        { name: "attempt1", fn: async () => { throw new Error("fail1"); } },
        { name: "attempt2", fn: async () => { throw new Error("fail2"); } },
      ]);

      expect(context.userMessage).toContain("failed");
      expect(context.userMessage).toContain("attempt1");
      expect(context.userMessage).toContain("attempt2");
    });
  });
});
