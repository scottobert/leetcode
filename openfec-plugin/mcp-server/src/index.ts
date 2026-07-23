#!/usr/bin/env node
/**
 * MCP server for the OpenFEC API — the U.S. Federal Election Commission's
 * public campaign-finance dataset (candidates, committees, filings, financial
 * totals, itemized contributions/disbursements/independent expenditures, and
 * election summaries).
 *
 * Authentication: set OPENFEC_API_KEY to an api.data.gov key
 * (https://api.open.fec.gov/developers/). Falls back to the rate-limited
 * DEMO_KEY when unset.
 *
 * Transport: stdio by default (local use). Set TRANSPORT=http to run as a
 * stateless streamable-HTTP service on PORT (default 3000).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

import { API_KEY_ENV, DEMO_API_KEY } from "./constants.js";
import { getApiKey } from "./services/client.js";
import { registerCandidateTools } from "./tools/candidates.js";
import { registerCommitteeTools } from "./tools/committees.js";
import { registerNameTools } from "./tools/names.js";
import { registerFinancialTools } from "./tools/financials.js";
import { registerFilingTools } from "./tools/filings.js";
import { registerScheduleTools } from "./tools/schedules.js";
import { registerElectionTools } from "./tools/elections.js";

/** Build a fully-configured MCP server instance with all tools registered. */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "openfec-mcp-server",
    version: "1.0.0",
  });

  registerNameTools(server);
  registerCandidateTools(server);
  registerCommitteeTools(server);
  registerFinancialTools(server);
  registerFilingTools(server);
  registerScheduleTools(server);
  registerElectionTools(server);

  return server;
}

/** Warn (once, on stderr) when running with the shared demo key. */
function warnIfDemoKey(): void {
  if (getApiKey() === DEMO_API_KEY) {
    console.error(
      `[openfec-mcp-server] WARNING: ${API_KEY_ENV} is not set — using DEMO_KEY, ` +
        "which is heavily rate limited. Get a free key at https://api.open.fec.gov/developers/."
    );
  }
}

async function runStdio(): Promise<void> {
  warnIfDemoKey();
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[openfec-mcp-server] running on stdio");
}

async function runHttp(): Promise<void> {
  warnIfDemoKey();
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", server: "openfec-mcp-server" });
  });

  app.post("/mcp", async (req, res) => {
    // New stateless transport + server per request avoids request-id
    // collisions and keeps horizontal scaling simple.
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  app.listen(port, () => {
    console.error(
      `[openfec-mcp-server] running on http://localhost:${port}/mcp`
    );
  });
}

const transport = (process.env.TRANSPORT || "stdio").toLowerCase();
const main = transport === "http" ? runHttp : runStdio;

main().catch((error) => {
  console.error("[openfec-mcp-server] fatal error:", error);
  process.exit(1);
});
