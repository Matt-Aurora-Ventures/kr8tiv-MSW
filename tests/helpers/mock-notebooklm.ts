import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Server } from "node:http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface MockNotebookLMServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

export async function startMockNotebookLM(options?: {
  port?: number;
  delayMs?: number; // Simulate network latency
}): Promise<MockNotebookLMServer> {
  const app = express();
  const delay = options?.delayMs ?? 0;

  // Middleware to simulate network latency
  if (delay > 0) {
    app.use((req, res, next) => {
      setTimeout(next, delay);
    });
  }

  // Serve mock UI HTML
  app.get("/notebook/:id", (req, res) => {
    const htmlPath = path.join(__dirname, "../mocks/notebooklm-ui.html");
    res.sendFile(htmlPath);
  });

  // Optional: API endpoint for programmatic testing
  app.post("/api/query", express.json(), (req, res) => {
    const { query } = req.body;
    const mockResponse = {
      answer: `Mock response to: ${query}`,
      citations: ["test.md"],
      suggestedTopics: ["Related topic 1", "Related topic 2"],
    };
    res.json(mockResponse);
  });

  const port = options?.port ?? 0; // Random port if not specified
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(port, () => resolve(s));
  });

  const actualPort = (server.address() as any).port;
  const url = `http://localhost:${actualPort}/notebook/mock-123`;

  return {
    url,
    port: actualPort,
    close: async () => {
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    },
  };
}
