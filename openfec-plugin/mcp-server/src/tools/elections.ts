/**
 * Elections tool: a financial summary of all candidates competing in a given
 * election (office + state/district + cycle).
 *
 * OpenFEC endpoint:
 *   GET /elections/   — per-candidate financial summary for one election
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { normalizePage, openFecRequest } from "../services/client.js";
import { buildPageResult, money, orNA } from "../services/format.js";
import { offsetPaginationFields, responseFormatField } from "../schemas/common.js";
import { registerReadOnlyTool } from "./shared.js";
import type { OpenFecResponse } from "../types.js";

interface ElectionCandidate {
  candidate_id?: string;
  candidate_name?: string;
  party_full?: string;
  incumbent_challenge_full?: string;
  total_receipts?: number;
  total_disbursements?: number;
  cash_on_hand_end_period?: number;
  coverage_end_date?: string;
}

function renderElectionCandidate(c: ElectionCandidate): string {
  const lines = [`## ${orNA(c.candidate_name)} (${orNA(c.candidate_id)})`];
  if (c.party_full) lines.push(`- **Party**: ${c.party_full}`);
  if (c.incumbent_challenge_full)
    lines.push(`- **Status**: ${c.incumbent_challenge_full}`);
  lines.push(`- **Total receipts**: ${money(c.total_receipts)}`);
  lines.push(`- **Total disbursements**: ${money(c.total_disbursements)}`);
  lines.push(`- **Cash on hand**: ${money(c.cash_on_hand_end_period)}`);
  return lines.join("\n");
}

const input = {
  office: z
    .enum(["president", "senate", "house"])
    .describe("Office being contested: 'president', 'senate', or 'house'."),
  cycle: z
    .number()
    .int()
    .describe("Election cycle (even year, e.g. 2024)."),
  state: z
    .string()
    .length(2)
    .optional()
    .describe("Two-letter state code (required for senate/house)."),
  district: z
    .string()
    .optional()
    .describe("Two-digit House district (required for house; e.g. '01')."),
  election_full: z
    .boolean()
    .default(true)
    .describe(
      "Aggregate across the full election period (true) vs a single two-year cycle (false)."
    ),
  ...offsetPaginationFields,
  ...responseFormatField,
};

export function registerElectionTools(server: McpServer): void {
  registerReadOnlyTool(
    server,
    "openfec_search_elections",
    {
      title: "Get Election Financial Summary",
      description: `Summarize the field of candidates in a specific election, with each candidate's headline finances (receipts, disbursements, cash on hand). Great for "who's running and how much have they raised" questions.

Args:
  - office ('president'|'senate'|'house'): required
  - cycle (number): required election year (e.g. 2024)
  - state (string): two-letter code (required for senate/house)
  - district (string): two-digit district (required for house)
  - election_full (boolean): full election period vs single cycle (default true)
  - page, per_page, response_format

Returns: one record per candidate in the race with party, incumbent/challenger status, total receipts, total disbursements, and cash on hand.

Examples:
  - "Who ran for president in 2024 and how much did they raise?" -> office='president', cycle=2024
  - "Financial summary of the 2024 Ohio Senate race" -> office='senate', state='OH', cycle=2024
  - "2024 candidates in California's 12th House district" -> office='house', state='CA', district='12', cycle=2024`,
      inputSchema: input,
    },
    async (args) => {
      const { page, per_page, response_format, ...filters } = args;
      const data = await openFecRequest<OpenFecResponse<ElectionCandidate>>(
        "elections",
        { ...filters, page, per_page }
      );
      const norm = normalizePage(data, page);
      return buildPageResult(
        `Election Summary — ${filters.office} ${filters.cycle}`,
        norm,
        response_format,
        renderElectionCandidate,
        "No election data found. Ensure office/state/district/cycle are valid (state required for senate/house, district for house)."
      );
    }
  );
}
