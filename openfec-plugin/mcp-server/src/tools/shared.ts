/**
 * Shared helpers for tool registration: consistent annotations and a wrapper
 * that centralizes error handling so individual tools stay focused on
 * request construction and formatting.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { handleApiError } from "../services/client.js";
import { errorResult, type ToolResult } from "../services/format.js";

/**
 * Every tool in this server is read-only (the OpenFEC API is a public,
 * query-only dataset), interacts with an external service, and is safe to
 * repeat.
 */
export const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

/** A Zod raw shape (plain object mapping field names to Zod validators). */
export type Shape = z.ZodRawShape;

/**
 * Register a read-only tool with the server, wrapping the handler so that any
 * thrown error (network failure, API error, validation) becomes a clean,
 * actionable tool error instead of crashing the request.
 *
 * `inputSchema` is a Zod raw shape (e.g. `{ query: z.string() }`), matching
 * the MCP SDK's `registerTool` contract.
 */
export function registerReadOnlyTool<S extends Shape>(
  server: McpServer,
  name: string,
  config: { title: string; description: string; inputSchema: S },
  handler: (args: z.infer<z.ZodObject<S>>) => Promise<ToolResult>
): void {
  // The SDK validates args against inputSchema before invoking the callback.
  // We wrap the handler so any thrown error becomes a clean tool error.
  const callback = async (
    args: z.infer<z.ZodObject<S>>
  ): Promise<ToolResult> => {
    try {
      return await handler(args);
    } catch (error) {
      return errorResult(handleApiError(error));
    }
  };

  server.registerTool(
    name,
    {
      title: config.title,
      description: config.description,
      inputSchema: config.inputSchema,
      annotations: READ_ONLY_ANNOTATIONS,
    },
    callback as Parameters<typeof server.registerTool>[2]
  );
}
