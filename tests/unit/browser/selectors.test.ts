// vitest globals enabled - no import needed
import { chromium, type Browser, type Page } from "playwright";
import { startMockNotebookLM, type MockNotebookLMServer } from "../../helpers/mock-notebooklm.js";
import { Selectors } from "../../../src/browser/selectors.js";

describe("NotebookLM selectors", () => {
  let browser: Browser;
  let page: Page;
  let mockServer: MockNotebookLMServer;

  beforeAll(async () => {
    // Start mock NotebookLM server
    mockServer = await startMockNotebookLM();

    // Launch real browser to test selectors
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    await page.goto(mockServer.url);
  }, 15000); // 15s timeout for browser launch

  afterAll(async () => {
    await page?.close();
    await browser?.close();
    await mockServer?.close();
  });

  describe("Selectors export", () => {
    it("exports all expected selector factory functions", () => {
      // Verify Selectors export exists and contains expected factories
      expect(Selectors).toBeDefined();
      expect(Selectors.chatInput).toBeDefined();
      expect(Selectors.sendButton).toBeDefined();
      expect(Selectors.topicPills).toBeDefined();
      expect(Selectors.responseContainer).toBeDefined();
      expect(typeof Selectors.chatInput).toBe("function");
      expect(typeof Selectors.sendButton).toBe("function");
    });
  });

  describe("chatInput selector", () => {
    it("finds chat input using semantic selector", async () => {
      const input = Selectors.chatInput(page);

      const isVisible = await input.isVisible();
      expect(isVisible).toBe(true);
      const ariaLabel = await input.getAttribute("aria-label");
      expect(ariaLabel?.toLowerCase()).toContain("ask");
    });

    it("chat input is editable", async () => {
      const input = Selectors.chatInput(page);
      await input.fill("test query");

      const value = await input.inputValue();
      expect(value).toBe("test query");
    });
  });

  describe("sendButton selector", () => {
    it("finds send button using semantic selector", async () => {
      const button = Selectors.sendButton(page);

      const isVisible = await button.isVisible();
      expect(isVisible).toBe(true);
      const ariaLabel = await button.getAttribute("aria-label");
      expect(ariaLabel?.toLowerCase()).toContain("send");
    });

    it("send button is clickable", async () => {
      const button = Selectors.sendButton(page);

      const isEnabled = await button.isEnabled();
      expect(isEnabled).toBe(true);
    });
  });

  describe("topicPills selector", () => {
    it("finds all topic pills using role and filter", async () => {
      const pills = Selectors.topicPills(page);
      const count = await pills.count();

      expect(count).toBeGreaterThanOrEqual(3); // Mock has 3 topics
    });

    it("topic pills have data-topic attributes", async () => {
      // Find pills with data-topic attribute
      const firstPill = page.locator('button[data-topic]').first();
      const topic = await firstPill.getAttribute("data-topic");

      expect(topic).toBeDefined();
      expect(topic).toMatch(/authentication|testing|browser/);
    });

    it("clicking topic pill generates response", async () => {
      const firstPill = page.locator('button[data-topic]').first();
      await firstPill.click();

      // Wait for response to appear
      await page.waitForSelector('[data-message-author="assistant"]', {
        timeout: 2000,
      });

      const responses = page.locator('[data-message-author="assistant"]');
      const count = await responses.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe("responseContainer selector", () => {
    it("finds response after topic click", async () => {
      const pill = page.locator('button[data-topic]').first();
      await pill.click();

      const response = Selectors.responseContainer(page).first();
      const isVisible = await response.isVisible();
      expect(isVisible).toBe(true);
    });

    it("response contains text content", async () => {
      const pill = page.locator('button[data-topic]').first();
      await pill.click();

      await page.waitForSelector('[data-message-author="assistant"]');
      const response = Selectors.responseContainer(page).first();
      const text = await response.textContent();

      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(10);
    });
  });

  describe("streaming completion detection", () => {
    it("detects streaming completion", async () => {
      const pill = page.locator('button[data-topic]').first();
      await pill.click();

      // Wait for streaming to complete (mock sets data-streaming="false" after 200ms)
      await page.waitForSelector('[data-streaming="false"]', {
        timeout: 3000,
      });

      const completed = page.locator('[data-streaming="false"]');
      const count = await completed.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});
