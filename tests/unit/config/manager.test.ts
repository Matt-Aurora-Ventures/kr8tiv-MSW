// vitest globals enabled - no import needed
import { ConfigManager } from "../../../src/config/manager.js";
import { createTestDir, cleanupTestDir } from "../../setup.js";
import fs from "node:fs";
import path from "node:path";

describe("ConfigManager", () => {
  let testDir: string;
  let configManager: ConfigManager;

  beforeEach(() => {
    testDir = createTestDir("config-test");
    configManager = new ConfigManager(testDir);
  });

  afterEach(() => {
    cleanupTestDir(testDir);
  });

  describe("loadConfig", () => {
    it("returns default config when file does not exist", () => {
      const { config, validation } = configManager.loadConfig();

      expect(config.version).toBe("1.0.0");
      expect(config.headless).toBe(false);
      expect(config.timeout).toBe(120000);
      expect(validation.valid).toBe(true);
      expect(validation.warnings).toContain("No config found, using defaults");
    });

    it("loads valid config from disk", () => {
      const configPath = path.join(testDir, ".msw", "config.json");
      fs.mkdirSync(path.dirname(configPath), { recursive: true });

      const validConfig = {
        version: "1.0.0",
        notebookUrl: "https://notebooklm.google.com/notebook/abc123",
        headless: true,
        timeout: 60000,
      };
      fs.writeFileSync(configPath, JSON.stringify(validConfig));

      const { config, validation } = configManager.loadConfig();

      expect(config.version).toBe("1.0.0");
      expect(config.notebookUrl).toBe(validConfig.notebookUrl);
      expect(config.headless).toBe(true);
      expect(validation.valid).toBe(true);
    });

    it("handles corrupted config file", () => {
      const configPath = path.join(testDir, ".msw", "config.json");
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      fs.writeFileSync(configPath, "not-valid-json{");

      const { config, validation } = configManager.loadConfig();

      // Should return default config
      expect(config.version).toBe("1.0.0");
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain("Failed to load config");
    });
  });

  describe("validate", () => {
    it("accepts valid config object", () => {
      const validConfig = {
        version: "1.0.0",
        notebookUrl: "https://notebooklm.google.com/notebook/abc123",
        headless: false,
        timeout: 120000,
      };

      const result = configManager.validate(validConfig);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects invalid notebookUrl", () => {
      const invalidConfig = {
        version: "1.0.0",
        notebookUrl: "not-a-valid-url",
      };

      const result = configManager.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Invalid notebookUrl format");
    });

    it("rejects timeout < 1000", () => {
      const invalidConfig = {
        version: "1.0.0",
        timeout: 500,
      };

      const result = configManager.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("timeout must be a number >= 1000");
    });

    it("validates autoConversation.scoreThreshold range", () => {
      const invalidConfig = {
        version: "1.0.0",
        autoConversation: {
          enabled: true,
          maxDepth: 10,
          scoreThreshold: 150, // Invalid: > 100
        },
      };

      const result = configManager.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("scoreThreshold must be between 0 and 100");
    });

    it("validates ralph.maxIterations >= 1", () => {
      const invalidConfig = {
        version: "1.0.0",
        ralph: {
          enabled: true,
          maxIterations: 0, // Invalid: < 1
        },
      };

      const result = configManager.validate(invalidConfig);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("ralph.maxIterations must be a number >= 1");
    });

    it("applies defaults for missing version field", () => {
      const configWithoutVersion: any = {
        notebookUrl: "https://notebooklm.google.com/notebook/abc123",
      };

      const result = configManager.validate(configWithoutVersion);

      expect(result.valid).toBe(true);
      expect(result.migrated).toBe(true); // Migrated because version was missing
      expect(configWithoutVersion.version).toBe("1.0.0"); // Default applied
    });
  });

  describe("saveConfig", () => {
    it("saves config to disk", () => {
      const config = {
        version: "1.0.0",
        notebookUrl: "https://notebooklm.google.com/notebook/test",
        headless: true,
      };

      configManager.saveConfig(config);

      const configPath = configManager.getConfigPath();
      expect(fs.existsSync(configPath)).toBe(true);

      const saved = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      expect(saved.version).toBe("1.0.0");
      expect(saved.headless).toBe(true);
    });

    it("creates directory if missing", () => {
      const config = {
        version: "1.0.0",
      };

      configManager.saveConfig(config);

      const configPath = configManager.getConfigPath();
      expect(fs.existsSync(path.dirname(configPath))).toBe(true);
    });
  });

  describe("initConfig", () => {
    it("creates default config file", () => {
      const config = configManager.initConfig();

      expect(config.version).toBe("1.0.0");
      expect(fs.existsSync(configManager.getConfigPath())).toBe(true);
    });

    it("includes notebookUrl if provided", () => {
      const notebookUrl = "https://notebooklm.google.com/notebook/test123";
      const config = configManager.initConfig(notebookUrl);

      expect(config.notebookUrl).toBe(notebookUrl);
    });
  });

  describe("updateConfig", () => {
    it("updates existing config fields", () => {
      configManager.initConfig();

      const validation = configManager.updateConfig({
        headless: true,
        timeout: 60000,
      });

      expect(validation.valid).toBe(true);

      const { config } = configManager.loadConfig();
      expect(config.headless).toBe(true);
      expect(config.timeout).toBe(60000);
    });

    it("validates updates before saving", () => {
      configManager.initConfig();

      const validation = configManager.updateConfig({
        timeout: 500, // Invalid
      });

      expect(validation.valid).toBe(false);

      // Config should not have been updated
      const { config } = configManager.loadConfig();
      expect(config.timeout).toBe(120000); // Still default
    });
  });

  describe("configExists", () => {
    it("returns false when config does not exist", () => {
      expect(configManager.configExists()).toBe(false);
    });

    it("returns true when config exists", () => {
      configManager.initConfig();
      expect(configManager.configExists()).toBe(true);
    });
  });

  describe("detectDrift", () => {
    it("detects changes between snapshot and current config", () => {
      configManager.initConfig("https://notebooklm.google.com/notebook/test");
      configManager.createSnapshot();

      // Modify config
      configManager.updateConfig({ headless: true });

      const { hasDrift, changes } = configManager.detectDrift();

      expect(hasDrift).toBe(true);
      expect(changes.length).toBeGreaterThan(0);
      expect(changes[0]).toContain("headless");
    });

    it("returns no drift when config unchanged", () => {
      configManager.initConfig();
      configManager.createSnapshot();

      const { hasDrift, changes } = configManager.detectDrift();

      expect(hasDrift).toBe(false);
      expect(changes).toHaveLength(0);
    });

    it("handles missing snapshot gracefully", () => {
      const { hasDrift, changes } = configManager.detectDrift();

      expect(hasDrift).toBe(false);
      expect(changes[0]).toContain("No snapshot available");
    });
  });

  describe("resetToSnapshot", () => {
    it("restores config from snapshot", () => {
      configManager.initConfig();
      configManager.createSnapshot();

      // Modify config
      configManager.updateConfig({ headless: true });

      const result = configManager.resetToSnapshot();

      expect(result.success).toBe(true);

      const { config } = configManager.loadConfig();
      expect(config.headless).toBe(false); // Reverted to snapshot
    });

    it("returns error when no snapshot exists", () => {
      const result = configManager.resetToSnapshot();

      expect(result.success).toBe(false);
      expect(result.error).toContain("No snapshot available");
    });
  });
});
