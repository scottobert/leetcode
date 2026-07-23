/**
 * Name typeahead lookup: quick fuzzy resolution of a candidate or committee
 * name to its FEC ID.
 *
 * OpenFEC endpoints:
 *   GET /names/candidates/   — typeahead over candidate names
 *   GET /names/committees/   — typeahead over committee names
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { openFecRequest } from "../services/client.js";
import { buildSingleResult, orNA } from "../services/format.js";
import { responseFormatField } from "../schemas/common.js";
import { registerReadOnlyTool } from "./shared.js";
import { ResponseFormat } from "../types.js";

interface NameMatch {
  id: string;
  name?: string;
  office_sought?: string;
  is_active?: boolean;
}

const input = {
  entity: z
    .enum(["candidates", "committees"])
    .describe("Which name index to search: 'candidates' or 'committees'."),
  q: z
    .string()
    .min(1, "A search string is required.")
    .describe("Partial name to look up (e.g. 'Warren', 'ActBlue')."),
  ...responseFormatField,
};

export function registerNameTools(server: McpServer): void {
  registerReadOnlyTool(
    server,
    "openfec_lookup_name",
    {
      title: "Look Up Candidate/Committee by Name",
      description: `Fast typeahead lookup that resolves a partial candidate or committee name to FEC IDs. Use this first when you only have a name and need an ID to feed into other tools.

Args:
  - entity ('candidates'|'committees'): which index to search
  - q (string): partial name
  - response_format ('markdown'|'json')

Returns: a list of up to ~20 best-matching { id, name, office_sought (candidates) | is_active (committees) } records. This is a lightweight name index — for full filtering use openfec_search_candidates / openfec_search_committees.

Examples:
  - "What's the FEC ID for Bernie Sanders?" -> entity='candidates', q='Sanders'
  - "Find the committee ID for the DNC" -> entity='committees', q='Democratic National'`,
      inputSchema: input,
    },
    async (args) => {
      const { entity, q, response_format } = args;
      const data = await openFecRequest<{ results?: NameMatch[] }>(
        `names/${entity}`,
        { q }
      );
      const results = data.results ?? [];

      if (results.length === 0) {
        return buildSingleResult(
          response_format,
          `No ${entity} matched '${q}'. Try a shorter or differently spelled query.`,
          { count: 0, results: [] }
        );
      }

      const markdown =
        response_format === ResponseFormat.MARKDOWN
          ? [
              `# Name matches for '${q}' (${entity})`,
              "",
              ...results.map((r) => {
                const extra =
                  entity === "candidates"
                    ? r.office_sought
                      ? ` — office ${r.office_sought}`
                      : ""
                    : r.is_active !== undefined
                      ? ` — ${r.is_active ? "active" : "inactive"}`
                      : "";
                return `- **${orNA(r.name)}** (${r.id})${extra}`;
              }),
            ].join("\n")
          : "";

      return buildSingleResult(response_format, markdown, {
        count: results.length,
        results,
      });
    }
  );
}
