import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type ToolRegistrar = (server: McpServer) => void;

export function registerTools(
  server: McpServer,
  registrars: ToolRegistrar[],
): void {
  for (const registrar of registrars) {
    registrar(server);
  }
}
