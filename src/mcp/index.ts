#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error("[msw-mcp-server] MCP server started on stdio transport");
}

main().catch((error: unknown) => {
  console.error("[msw-mcp-server] Fatal error:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
  console.error("[msw-mcp-server] Unhandled rejection:", reason);
});
