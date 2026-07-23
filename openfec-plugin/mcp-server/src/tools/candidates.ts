/**
 * Candidate tools: search the master candidate list and fetch detail for a
 * single candidate.
 *
 * OpenFEC endpoints:
 *   GET /candidates/           — filterable list of candidates
 *   GET /candidate/{id}/       — detail for one candidate
 *   GET /candidate/{id}/history/ — cycle-by-cycle history for one candidate
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

interface Candidate {
  candidate_id: string;
  name?: string;
  office_full?: string;
  office?: string;
  party_full?: string;
  party?: string;
  state?: string;
  district?: string;
  incumbent_challenge_full?: string;
  candidate_status?: string;
  election_years?: number[];
  cycles?: number[];
  active_through?: number;
  first_file_date?: string;
  principal_committees?: Array<{ committee_id: string; name?: string }>;
}

function renderCandidate(c: Candidate): string {
  const lines = [`## ${orNA(c.name)} (${c.candidate_id})`];
  const office = c.office_full || c.office;
  if (office) lines.push(`- **Office**: ${office}`);
  if (c.state) {
    lines.push(
      `- **State/District**: ${c.state}${c.district && c.district !== "00" ? `-${c.district}` : ""}`
    );
  }
  const party = c.party_full || c.party;
  if (party) lines.push(`- **Party**: ${party}`);
  if (c.incumbent_challenge_full)
    lines.push(`- **Status**: ${c.incumbent_challenge_full}`);
  if (c.candidate_status) lines.push(`- **Candidate status**: ${c.candidate_status}`);
  if (c.election_years?.length)
    lines.push(`- **Election years**: ${c.election_years.join(", ")}`);
  if (c.principal_committees?.length) {
    lines.push(
      `- **Principal committees**: ${c.principal_committees
        .map((pc) => `${pc.name ?? "?"} (${pc.committee_id})`)
        .join("; ")}`
    );
  }
  return lines.join("\n");
}

const OFFICE = z
  .enum(["H", "S", "P"])
  .describe("Office sought: H (House), S (Senate), or P (President).");

const searchInput = {
  q: z
    .string()
    .optional()
    .describe("Full-text name search (e.g. 'Warren', 'Smith John')."),
  candidate_id: z
    .array(z.string())
    .optional()
    .describe("One or more FEC candidate IDs (e.g. ['P80003338'])."),
  office: z
    .array(OFFICE)
    .optional()
    .describe("Filter by office(s): H, S, and/or P."),
  state: z
    .array(z.string().length(2))
    .optional()
    .describe("Two-letter state code(s) (e.g. ['CA', 'NY'])."),
  party: z
    .array(z.string())
    .optional()
    .describe("Party abbreviation(s) (e.g. ['DEM', 'REP', 'IND'])."),
  district: z
    .string()
    .optional()
    .describe("Two-digit House district (e.g. '01'; '00' for at-large)."),
  election_year: z
    .number()
    .int()
    .optional()
    .describe("Election year the candidate ran in (e.g. 2024)."),
  cycle: z
    .array(z.number().int())
    .optional()
    .describe("Two-year cycle(s) the candidate was active in (e.g. [2024])."),
  candidate_status: z
    .enum(["C", "F", "N", "P"])
    .optional()
    .describe(
      "Candidate status: C (statutory candidate), F (future), N (not yet), P (prior)."
    ),
  incumbent_challenge: z
    .enum(["I", "C", "O"])
    .optional()
    .describe("I (incumbent), C (challenger), or O (open seat)."),
  is_active_candidate: z
    .boolean()
    .optional()
    .describe("Limit to candidates currently active."),
  ...sortField,
  ...offsetPaginationFields,
  ...responseFormatField,
};

const getInput = {
  candidate_id: z
    .string()
    .min(1)
    .describe("FEC candidate ID (e.g. 'P80003338', 'S6VT00090')."),
  history: z
    .boolean()
    .default(false)
    .describe(
      "When true, include the candidate's cycle-by-cycle history (offices, parties, committees) instead of just the current record."
    ),
  ...responseFormatField,
};

export function registerCandidateTools(server: McpServer): void {
  registerReadOnlyTool(
    server,
    "openfec_search_candidates",
    {
      title: "Search FEC Candidates",
      description: `Search and filter the FEC master list of candidates for federal office (House, Senate, President).

Use this to find candidate IDs, see who ran for a given office/state/cycle, or look up a candidate by name. Returns candidate metadata only — use openfec_get_candidate_totals for finances.

Args:
  - q (string): full-text name search
  - candidate_id (string[]): specific FEC candidate IDs
  - office (('H'|'S'|'P')[]): House / Senate / President
  - state (string[]): two-letter state codes
  - party (string[]): party abbreviations (DEM, REP, IND, ...)
  - district (string): two-digit House district
  - election_year (number), cycle (number[]): filter by year/cycle
  - candidate_status, incumbent_challenge, is_active_candidate: status filters
  - sort (string): e.g. 'name', '-election_years'
  - page, per_page: pagination (per_page 1-100, default 20)
  - response_format ('markdown'|'json')

Returns: paginated list of candidates. Each record includes candidate_id, name, office_full, party_full, state, district, incumbent_challenge_full, candidate_status, and election_years. Response has total, count, has_more, and next_page for pagination.

Examples:
  - "Who are the Democratic Senate candidates from Vermont?" -> office=['S'], state=['VT'], party=['DEM']
  - "Find Elizabeth Warren's candidate ID" -> q='Warren', office=['S']`,
      inputSchema: searchInput,
    },
    async (args) => {
      const {
        page,
        per_page,
        response_format,
        ...filters
      } = args;
      const data = await openFecRequest<OpenFecResponse<Candidate>>(
        "candidates",
        { ...filters, page, per_page }
      );
      const norm = normalizePage(data, page);
      return buildPageResult(
        "FEC Candidate Search",
        norm,
        response_format,
        renderCandidate,
        "No candidates found matching those filters. Try broadening the search (fewer filters, or use `q` for a name)."
      );
    }
  );

  registerReadOnlyTool(
    server,
    "openfec_get_candidate",
    {
      title: "Get FEC Candidate Detail",
      description: `Fetch detailed information for a single candidate by FEC candidate ID, optionally including their cycle-by-cycle history.

Args:
  - candidate_id (string): FEC candidate ID (e.g. 'P80003338')
  - history (boolean): include full historical records across cycles (default false)
  - response_format ('markdown'|'json')

Returns: the candidate's detail record (name, office, party, state/district, status, election years, principal committees). With history=true, returns all historical records.

Examples:
  - "Show details for candidate P80003338" -> candidate_id='P80003338'
  - "What offices has candidate S6VT00090 run for over time?" -> candidate_id='S6VT00090', history=true`,
      inputSchema: getInput,
    },
    async (args) => {
      const { candidate_id, history, response_format } = args;
      const endpoint = history
        ? `candidate/${encodeURIComponent(candidate_id)}/history`
        : `candidate/${encodeURIComponent(candidate_id)}`;
      const data = await openFecRequest<OpenFecResponse<Candidate>>(endpoint);
      const results = data.results ?? [];
      if (results.length === 0) {
        return errorResult(
          `No candidate found with ID '${candidate_id}'. Use openfec_search_candidates to find valid IDs.`
        );
      }

      if (history) {
        const norm = normalizePage(data);
        return buildPageResult(
          `Candidate History: ${candidate_id}`,
          norm,
          response_format,
          renderCandidate,
          `No history for candidate '${candidate_id}'.`
        );
      }

      const c = results[0];
      const markdown =
        response_format === ResponseFormat.MARKDOWN
          ? renderCandidate(c) +
            (c.first_file_date
              ? `\n- **First filed**: ${c.first_file_date}`
              : "")
          : "";
      return buildSingleResult(response_format, markdown, {
        candidate: c,
      });
    }
  );
}
