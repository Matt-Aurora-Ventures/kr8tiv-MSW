import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const VERSION = "0.1.0";

export function createServer(): McpServer {
  const server = new McpServer({
    name: "msw-protocol",
    version: VERSION,
  });

  return server;
}
