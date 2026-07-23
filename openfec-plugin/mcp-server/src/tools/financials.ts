/**
 * Financial totals tools: aggregate receipts/disbursements for a candidate or
 * a committee, broken out by two-year cycle.
 *
 * OpenFEC endpoints:
 *   GET /candidate/{id}/totals/   — per-cycle totals for a candidate
 *   GET /committee/{id}/totals/   — per-cycle totals for a committee
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { normalizePage, openFecRequest } from "../services/client.js";
import { buildPageResult, money, orNA } from "../services/format.js";
import { offsetPaginationFields, responseFormatField } from "../schemas/common.js";
import { registerReadOnlyTool } from "./shared.js";
import type { OpenFecResponse } from "../types.js";

interface Totals {
  cycle?: number;
  receipts?: number;
  disbursements?: number;
  cash_on_hand_end_period?: number;
  last_cash_on_hand_end_period?: number;
  debts_owed_by_committee?: number;
  individual_contributions?: number;
  individual_itemized_contributions?: number;
  individual_unitemized_contributions?: number;
  other_political_committee_contributions?: number;
  political_party_committee_contributions?: number;
  contributions?: number;
  contribution_refunds?: number;
  operating_expenditures?: number;
  independent_expenditures?: number;
  coverage_start_date?: string;
  coverage_end_date?: string;
  committee_id?: string;
  candidate_id?: string;
  committee_name?: string;
  committee_type_full?: string;
}

function renderTotals(t: Totals): string {
  const label = t.cycle ? `${t.cycle} cycle` : "Totals";
  const lines = [`## ${label}`];
  if (t.coverage_start_date || t.coverage_end_date) {
    lines.push(
      `- **Coverage**: ${orNA(t.coverage_start_date)} → ${orNA(t.coverage_end_date)}`
    );
  }
  lines.push(`- **Total receipts**: ${money(t.receipts)}`);
  lines.push(`- **Total disbursements**: ${money(t.disbursements)}`);
  if (t.individual_contributions !== undefined)
    lines.push(`- **Individual contributions**: ${money(t.individual_contributions)}`);
  if (t.other_political_committee_contributions !== undefined)
    lines.push(
      `- **PAC contributions**: ${money(t.other_political_committee_contributions)}`
    );
  if (t.political_party_committee_contributions !== undefined)
    lines.push(
      `- **Party committee contributions**: ${money(t.political_party_committee_contributions)}`
    );
  if (t.operating_expenditures !== undefined)
    lines.push(`- **Operating expenditures**: ${money(t.operating_expenditures)}`);
  if (t.independent_expenditures !== undefined)
    lines.push(`- **Independent expenditures**: ${money(t.independent_expenditures)}`);
  lines.push(`- **Cash on hand (end of period)**: ${money(t.cash_on_hand_end_period)}`);
  if (t.debts_owed_by_committee !== undefined)
    lines.push(`- **Debts owed by committee**: ${money(t.debts_owed_by_committee)}`);
  return lines.join("\n");
}

const candidateInput = {
  candidate_id: z
    .string()
    .min(1)
    .describe("FEC candidate ID (e.g. 'P80003338')."),
  cycle: z
    .array(z.number().int())
    .optional()
    .describe("Restrict to specific two-year cycle(s) (e.g. [2024])."),
  full_election: z
    .boolean()
    .optional()
    .describe(
      "For Senate/President, aggregate totals across the full multi-cycle election period rather than a single two-year cycle."
    ),
  ...offsetPaginationFields,
  ...responseFormatField,
};

const committeeInput = {
  committee_id: z
    .string()
    .min(1)
    .describe("FEC committee ID (e.g. 'C00401224')."),
  cycle: z
    .array(z.number().int())
    .optional()
    .describe("Restrict to specific two-year cycle(s) (e.g. [2024])."),
  ...offsetPaginationFields,
  ...responseFormatField,
};

export function registerFinancialTools(server: McpServer): void {
  registerReadOnlyTool(
    server,
    "openfec_get_candidate_totals",
    {
      title: "Get Candidate Financial Totals",
      description: `Retrieve aggregate campaign-finance totals for a candidate, broken out by two-year election cycle. Totals combine the candidate's authorized committees.

Args:
  - candidate_id (string): FEC candidate ID
  - cycle (number[]): restrict to specific cycle(s)
  - full_election (boolean): aggregate across a full Senate/Presidential election period
  - page, per_page, response_format

Returns: one record per cycle with total receipts, disbursements, contribution breakdowns, cash on hand, and debts. Sorted newest-first by the API.

Examples:
  - "How much has candidate P80003338 raised in 2024?" -> candidate_id='P80003338', cycle=[2024]
  - "Show all-cycle fundraising for S6VT00090" -> candidate_id='S6VT00090'`,
      inputSchema: candidateInput,
    },
    async (args) => {
      const { candidate_id, page, per_page, response_format, ...filters } = args;
      const data = await openFecRequest<OpenFecResponse<Totals>>(
        `candidate/${encodeURIComponent(candidate_id)}/totals`,
        { ...filters, page, per_page }
      );
      const norm = normalizePage(data, page);
      return buildPageResult(
        `Financial Totals — Candidate ${candidate_id}`,
        norm,
        response_format,
        renderTotals,
        `No financial totals found for candidate '${candidate_id}'. The candidate may have no reported activity, or the ID may be invalid.`
      );
    }
  );

  registerReadOnlyTool(
    server,
    "openfec_get_committee_totals",
    {
      title: "Get Committee Financial Totals",
      description: `Retrieve aggregate financial totals for a committee, broken out by two-year cycle. The exact fields depend on committee type (candidate committee, PAC, party, etc.).

Args:
  - committee_id (string): FEC committee ID
  - cycle (number[]): restrict to specific cycle(s)
  - page, per_page, response_format

Returns: one record per cycle with total receipts, disbursements, contribution breakdowns (individual / PAC / party), operating and independent expenditures, cash on hand, and debts.

Examples:
  - "What were committee C00401224's total receipts in 2024?" -> committee_id='C00401224', cycle=[2024]
  - "Show spending history for committee C00575795" -> committee_id='C00575795'`,
      inputSchema: committeeInput,
    },
    async (args) => {
      const { committee_id, page, per_page, response_format, ...filters } = args;
      const data = await openFecRequest<OpenFecResponse<Totals>>(
        `committee/${encodeURIComponent(committee_id)}/totals`,
        { ...filters, page, per_page }
      );
      const norm = normalizePage(data, page);
      return buildPageResult(
        `Financial Totals — Committee ${committee_id}`,
        norm,
        response_format,
        renderTotals,
        `No financial totals found for committee '${committee_id}'. The committee may have no reported activity, or the ID may be invalid.`
      );
    }
  );
}
