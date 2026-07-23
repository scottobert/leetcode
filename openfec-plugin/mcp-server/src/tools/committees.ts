/**
 * Committee tools: search the master committee list and fetch detail for a
 * single committee.
 *
 * OpenFEC endpoints:
 *   GET /committees/       — filterable list of committees
 *   GET /committee/{id}/   — detail for one committee
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { normalizePage, openFecRequest } from "../services/client.js";
import {
  buildPageResult,
  buildSingleResult,
  errorResult,
  orNA,
} from "../services/format.js";
import {
  offsetPaginationFields,
  responseFormatField,
  sortField,
} from "../schemas/common.js";
import { registerReadOnlyTool } from "./shared.js";
import { ResponseFormat } from "../types.js";
import type { OpenFecResponse } from "../types.js";

interface Committee {
  committee_id: string;
  name?: string;
  committee_type_full?: string;
  committee_type?: string;
  designation_full?: string;
  designation?: string;
  organization_type_full?: string;
  party_full?: string;
  state?: string;
  treasurer_name?: string;
  candidate_ids?: string[];
  cycles?: number[];
  first_file_date?: string;
  last_file_date?: string;
  filing_frequency?: string;
}

function renderCommittee(c: Committee): string {
  const lines = [`## ${orNA(c.name)} (${c.committee_id})`];
  if (c.committee_type_full)
    lines.push(`- **Type**: ${c.committee_type_full}`);
  if (c.designation_full)
    lines.push(`- **Designation**: ${c.designation_full}`);
  if (c.party_full) lines.push(`- **Party**: ${c.party_full}`);
  if (c.state) lines.push(`- **State**: ${c.state}`);
  if (c.treasurer_name) lines.push(`- **Treasurer**: ${c.treasurer_name}`);
  if (c.candidate_ids?.length)
    lines.push(`- **Linked candidates**: ${c.candidate_ids.join(", ")}`);
  return lines.join("\n");
}

const searchInput = {
  q: z
    .string()
    .optional()
    .describe("Full-text committee name search (e.g. 'Actblue')."),
  committee_id: z
    .array(z.string())
    .optional()
    .describe("One or more FEC committee IDs (e.g. ['C00401224'])."),
  candidate_id: z
    .array(z.string())
    .optional()
    .describe("Return committees associated with these candidate ID(s)."),
  committee_type: z
    .array(z.string().length(1))
    .optional()
    .describe(
      "Committee type code(s). Common: H/S/P (candidate cmtes), N/Q (PAC), O (Super PAC / IE-only), V/W (Hybrid PAC), X/Y (party), I (independent expenditor)."
    ),
  designation: z
    .array(z.string().length(1))
    .optional()
    .describe(
      "Designation code(s): P (principal campaign), A (authorized), D (leadership PAC), J (joint fundraiser), U (unauthorized), B (lobbyist/registrant PAC)."
    ),
  organization_type: z
    .array(z.string().length(1))
    .optional()
    .describe(
      "Organization type: C (corporation), L (labor org), M (membership org), T (trade assoc), V (cooperative), W (corp without capital stock)."
    ),
  state: z
    .array(z.string().length(2))
    .optional()
    .describe("Two-letter state code(s)."),
  party: z
    .array(z.string())
    .optional()
    .describe("Party abbreviation(s) (DEM, REP, ...)."),
  cycle: z
    .array(z.number().int())
    .optional()
    .describe("Two-year cycle(s) the committee was active in (e.g. [2024])."),
  treasurer_name: z
    .string()
    .optional()
    .describe("Filter by committee treasurer name."),
  ...sortField,
  ...offsetPaginationFields,
  ...responseFormatField,
};

const getInput = {
  committee_id: z
    .string()
    .min(1)
    .describe("FEC committee ID (e.g. 'C00401224')."),
  ...responseFormatField,
};

export function registerCommitteeTools(server: McpServer): void {
  registerReadOnlyTool(
    server,
    "openfec_search_committees",
    {
      title: "Search FEC Committees",
      description: `Search and filter the FEC master list of committees: candidate campaign committees, PACs, Super PACs, party committees, and more.

Use this to find committee IDs, identify a candidate's committees, or list committees by type/state/cycle. Returns committee metadata only — use openfec_get_committee_totals for finances.

Args:
  - q (string): full-text committee name search
  - committee_id (string[]): specific FEC committee IDs
  - candidate_id (string[]): committees linked to these candidates
  - committee_type (string[]): type codes (O = Super PAC, N/Q = PAC, H/S/P = candidate, X/Y = party, ...)
  - designation (string[]): P/A/D/J/U/B
  - organization_type (string[]): C/L/M/T/V/W
  - state (string[]), party (string[]), cycle (number[])
  - treasurer_name (string)
  - sort (string), page, per_page, response_format

Returns: paginated list of committees. Each record includes committee_id, name, committee_type_full, designation_full, party_full, state, treasurer_name, and candidate_ids.

Examples:
  - "List Super PACs active in 2024" -> committee_type=['O'], cycle=[2024]
  - "Find ActBlue's committee ID" -> q='ActBlue'
  - "What committees are tied to candidate P80003338?" -> candidate_id=['P80003338']`,
      inputSchema: searchInput,
    },
    async (args) => {
      const { page, per_page, response_format, ...filters } = args;
      const data = await openFecRequest<OpenFecResponse<Committee>>(
        "committees",
        { ...filters, page, per_page }
      );
      const norm = normalizePage(data, page);
      return buildPageResult(
        "FEC Committee Search",
        norm,
        response_format,
        renderCommittee,
        "No committees found matching those filters. Try `q` for a name search or fewer filters."
      );
    }
  );

  registerReadOnlyTool(
    server,
    "openfec_get_committee",
    {
      title: "Get FEC Committee Detail",
      description: `Fetch detailed information for a single committee by FEC committee ID.

Args:
  - committee_id (string): FEC committee ID (e.g. 'C00401224')
  - response_format ('markdown'|'json')

Returns: the committee's detail record — name, type, designation, party, state, treasurer, linked candidate IDs, active cycles, and filing dates.

Examples:
  - "Show details for committee C00401224" -> committee_id='C00401224'`,
      inputSchema: getInput,
    },
    async (args) => {
      const { committee_id, response_format } = args;
      const data = await openFecRequest<OpenFecResponse<Committee>>(
        `committee/${encodeURIComponent(committee_id)}`
      );
      const results = data.results ?? [];
      if (results.length === 0) {
        return errorResult(
          `No committee found with ID '${committee_id}'. Use openfec_search_committees to find valid IDs.`
        );
      }
      const c = results[0];
      const markdown =
        response_format === ResponseFormat.MARKDOWN
          ? renderCommittee(c) +
            (c.first_file_date ? `\n- **First filed**: ${c.first_file_date}` : "") +
            (c.filing_frequency
              ? `\n- **Filing frequency**: ${c.filing_frequency}`
              : "")
          : "";
      return buildSingleResult(response_format, markdown, { committee: c });
    }
  );
}
