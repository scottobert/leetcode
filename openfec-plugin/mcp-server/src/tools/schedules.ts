/**
 * Itemized transaction tools (FEC "schedules"):
 *   - Schedule A: receipts / individual contributions
 *   - Schedule B: disbursements
 *   - Schedule E: independent expenditures
 *
 * These endpoints are extremely high volume, so the API uses seek (cursor)
 * pagination instead of page numbers: each response returns a `next_cursor`
 * object that must be passed back via the `cursor` argument to fetch the next
 * block. Callers should bound queries with two_year_transaction_period,
 * dates, and/or committee_id.
 *
 * OpenFEC endpoints:
 *   GET /schedules/schedule_a/
 *   GET /schedules/schedule_b/
 *   GET /schedules/schedule_e/
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  normalizePage,
  openFecRequest,
  type QueryParams,
} from "../services/client.js";
import { buildPageResult, money, orNA } from "../services/format.js";
import {
  responseFormatField,
  sortField,
  twoYearPeriodField,
} from "../schemas/common.js";
import { registerReadOnlyTool } from "./shared.js";
import { ResponseFormat } from "../types.js";
import type { NormalizedPage, OpenFecResponse } from "../types.js";

/** Cursor field shared by all seek-paginated schedule tools. */
const cursorField = {
  cursor: z
    .record(z.union([z.string(), z.number()]))
    .optional()
    .describe(
      "Seek-pagination cursor. To get the next block of results, pass back the `next_cursor` object returned by the previous call. Omit for the first page."
    ),
};

/** per_page for schedule endpoints (max 100). */
const perPageField = {
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Number of results per block (1-100)."),
};

/** Common numeric/date range filters shared across schedules. */
const rangeFields = {
  min_date: z
    .string()
    .optional()
    .describe("Earliest transaction date (YYYY-MM-DD)."),
  max_date: z
    .string()
    .optional()
    .describe("Latest transaction date (YYYY-MM-DD)."),
  min_amount: z
    .number()
    .optional()
    .describe("Minimum transaction amount in dollars."),
  max_amount: z
    .number()
    .optional()
    .describe("Maximum transaction amount in dollars."),
};

/**
 * Shared executor: run a schedule query and build a paginated result. The
 * `cursor` object is spread directly into the query so its seek keys
 * (last_index, last_*_date, etc.) are sent verbatim.
 */
async function runSchedule<T>(
  endpoint: string,
  title: string,
  params: QueryParams,
  cursor: Record<string, string | number> | undefined,
  perPage: number,
  format: ResponseFormat,
  render: (item: T) => string,
  emptyMessage: string
) {
  const data = await openFecRequest<OpenFecResponse<T>>(endpoint, {
    ...params,
    ...(cursor ?? {}),
    per_page: perPage,
  });
  const norm: NormalizedPage<T> = normalizePage(data);
  return buildPageResult(title, norm, format, render, emptyMessage);
}

// ---------------------------------------------------------------------------
// Schedule A — receipts / individual contributions
// ---------------------------------------------------------------------------

interface ScheduleA {
  contributor_name?: string;
  contributor_city?: string;
  contributor_state?: string;
  contributor_employer?: string;
  contributor_occupation?: string;
  contribution_receipt_amount?: number;
  contribution_receipt_date?: string;
  committee_id?: string;
  committee?: { name?: string };
  receipt_type_full?: string;
  memo_text?: string;
}

function renderScheduleA(r: ScheduleA): string {
  const lines = [
    `## ${orNA(r.contributor_name)} — ${money(r.contribution_receipt_amount)}`,
  ];
  if (r.contribution_receipt_date)
    lines.push(`- **Date**: ${r.contribution_receipt_date}`);
  const loc = [r.contributor_city, r.contributor_state].filter(Boolean).join(", ");
  if (loc) lines.push(`- **Location**: ${loc}`);
  if (r.contributor_employer)
    lines.push(`- **Employer**: ${r.contributor_employer}`);
  if (r.contributor_occupation)
    lines.push(`- **Occupation**: ${r.contributor_occupation}`);
  const recipient = r.committee?.name || r.committee_id;
  if (recipient) lines.push(`- **Recipient committee**: ${recipient}`);
  if (r.receipt_type_full) lines.push(`- **Type**: ${r.receipt_type_full}`);
  return lines.join("\n");
}

const scheduleAInput = {
  committee_id: z
    .array(z.string())
    .optional()
    .describe("Recipient committee ID(s)."),
  contributor_name: z
    .string()
    .optional()
    .describe("Contributor name search (e.g. 'Smith')."),
  contributor_city: z.string().optional().describe("Contributor city."),
  contributor_state: z
    .array(z.string().length(2))
    .optional()
    .describe("Contributor state code(s)."),
  contributor_employer: z
    .string()
    .optional()
    .describe("Contributor employer search."),
  contributor_occupation: z
    .string()
    .optional()
    .describe("Contributor occupation search."),
  is_individual: z
    .boolean()
    .optional()
    .describe("Limit to itemized individual contributions only."),
  ...twoYearPeriodField,
  ...rangeFields,
  sort: z
    .string()
    .optional()
    .describe(
      "Sort field: 'contribution_receipt_date' or 'contribution_receipt_amount' (prefix '-' for descending)."
    ),
  ...perPageField,
  ...cursorField,
  ...responseFormatField,
};

// ---------------------------------------------------------------------------
// Schedule B — disbursements
// ---------------------------------------------------------------------------

interface ScheduleB {
  recipient_name?: string;
  recipient_city?: string;
  recipient_state?: string;
  disbursement_amount?: number;
  disbursement_date?: string;
  disbursement_description?: string;
  disbursement_purpose_category?: string;
  committee_id?: string;
  committee?: { name?: string };
}

function renderScheduleB(r: ScheduleB): string {
  const lines = [
    `## ${orNA(r.recipient_name)} — ${money(r.disbursement_amount)}`,
  ];
  if (r.disbursement_date) lines.push(`- **Date**: ${r.disbursement_date}`);
  const loc = [r.recipient_city, r.recipient_state].filter(Boolean).join(", ");
  if (loc) lines.push(`- **Location**: ${loc}`);
  if (r.disbursement_description)
    lines.push(`- **Purpose**: ${r.disbursement_description}`);
  if (r.disbursement_purpose_category)
    lines.push(`- **Category**: ${r.disbursement_purpose_category}`);
  const payer = r.committee?.name || r.committee_id;
  if (payer) lines.push(`- **Paying committee**: ${payer}`);
  return lines.join("\n");
}

const scheduleBInput = {
  committee_id: z
    .array(z.string())
    .optional()
    .describe("Paying committee ID(s)."),
  recipient_name: z
    .string()
    .optional()
    .describe("Payee/recipient name search."),
  recipient_city: z.string().optional().describe("Recipient city."),
  recipient_state: z
    .array(z.string().length(2))
    .optional()
    .describe("Recipient state code(s)."),
  disbursement_description: z
    .string()
    .optional()
    .describe("Free-text search of the disbursement purpose description."),
  ...twoYearPeriodField,
  ...rangeFields,
  sort: z
    .string()
    .optional()
    .describe(
      "Sort field: 'disbursement_date' or 'disbursement_amount' (prefix '-' for descending)."
    ),
  ...perPageField,
  ...cursorField,
  ...responseFormatField,
};

// ---------------------------------------------------------------------------
// Schedule E — independent expenditures
// ---------------------------------------------------------------------------

interface ScheduleE {
  payee_name?: string;
  candidate_name?: string;
  candidate_id?: string;
  office_total_ytd?: number;
  support_oppose_indicator?: string;
  expenditure_amount?: number;
  expenditure_date?: string;
  expenditure_description?: string;
  category_code_full?: string;
  committee_id?: string;
  committee?: { name?: string };
}

function renderScheduleE(r: ScheduleE): string {
  const stance =
    r.support_oppose_indicator === "S"
      ? "SUPPORT"
      : r.support_oppose_indicator === "O"
        ? "OPPOSE"
        : orNA(r.support_oppose_indicator);
  const lines = [
    `## ${stance} ${orNA(r.candidate_name)} — ${money(r.expenditure_amount)}`,
  ];
  if (r.expenditure_date) lines.push(`- **Date**: ${r.expenditure_date}`);
  if (r.candidate_id) lines.push(`- **Candidate**: ${r.candidate_id}`);
  const spender = r.committee?.name || r.committee_id;
  if (spender) lines.push(`- **Spending committee**: ${spender}`);
  if (r.payee_name) lines.push(`- **Payee**: ${r.payee_name}`);
  if (r.expenditure_description)
    lines.push(`- **Purpose**: ${r.expenditure_description}`);
  return lines.join("\n");
}

const scheduleEInput = {
  committee_id: z
    .array(z.string())
    .optional()
    .describe("Spending committee ID(s)."),
  candidate_id: z
    .array(z.string())
    .optional()
    .describe("Targeted candidate ID(s)."),
  support_oppose_indicator: z
    .enum(["S", "O"])
    .optional()
    .describe("S = expenditure supports the candidate, O = opposes."),
  ...twoYearPeriodField,
  ...rangeFields,
  sort: z
    .string()
    .optional()
    .describe(
      "Sort field: 'expenditure_date' or 'expenditure_amount' (prefix '-' for descending)."
    ),
  ...perPageField,
  ...cursorField,
  ...responseFormatField,
};

export function registerScheduleTools(server: McpServer): void {
  registerReadOnlyTool(
    server,
    "openfec_search_contributions",
    {
      title: "Search Itemized Contributions (Schedule A)",
      description: `Search individual and other itemized receipts (Schedule A) — who gave money to which committee. This is a very large dataset; always bound it with two_year_transaction_period plus a committee_id, contributor filter, and/or date range.

Uses seek pagination: pass the returned next_cursor back via 'cursor' for the next block (page numbers are not supported here).

Args:
  - committee_id (string[]): recipient committee(s)
  - contributor_name / contributor_employer / contributor_occupation (string): text searches
  - contributor_city (string), contributor_state (string[])
  - is_individual (boolean): itemized individuals only
  - two_year_transaction_period (number): e.g. 2024 (strongly recommended)
  - min_date / max_date (YYYY-MM-DD), min_amount / max_amount (number)
  - sort ('contribution_receipt_date' | 'contribution_receipt_amount', '-' for desc)
  - per_page (1-100), cursor (object), response_format

Returns: itemized contributions with contributor name/location/employer/occupation, amount, date, and recipient committee. Includes next_cursor when more results exist.

Examples:
  - "Largest individual contributions to committee C00401224 in 2024" -> committee_id=['C00401224'], two_year_transaction_period=2024, sort='-contribution_receipt_amount'
  - "Contributions from Texas contributors named Smith in 2022" -> contributor_name='Smith', contributor_state=['TX'], two_year_transaction_period=2022`,
      inputSchema: scheduleAInput,
    },
    async (args) => {
      const { cursor, per_page, response_format, ...filters } = args;
      return runSchedule<ScheduleA>(
        "schedules/schedule_a",
        "Itemized Contributions (Schedule A)",
        filters as QueryParams,
        cursor,
        per_page,
        response_format,
        renderScheduleA,
        "No contributions found. Add or widen a two_year_transaction_period and check committee_id / contributor filters."
      );
    }
  );

  registerReadOnlyTool(
    server,
    "openfec_search_disbursements",
    {
      title: "Search Itemized Disbursements (Schedule B)",
      description: `Search itemized disbursements (Schedule B) — how committees spent money and to whom. Large dataset; bound it with two_year_transaction_period plus committee_id / recipient / date filters.

Uses seek pagination: pass the returned next_cursor back via 'cursor' for the next block.

Args:
  - committee_id (string[]): paying committee(s)
  - recipient_name (string), recipient_city (string), recipient_state (string[])
  - disbursement_description (string): free-text purpose search
  - two_year_transaction_period (number): e.g. 2024 (strongly recommended)
  - min_date / max_date (YYYY-MM-DD), min_amount / max_amount (number)
  - sort ('disbursement_date' | 'disbursement_amount', '-' for desc)
  - per_page (1-100), cursor (object), response_format

Returns: disbursements with payee name/location, amount, date, purpose/category, and paying committee. Includes next_cursor when more results exist.

Examples:
  - "Largest disbursements by committee C00401224 in 2024" -> committee_id=['C00401224'], two_year_transaction_period=2024, sort='-disbursement_amount'
  - "Payments described as 'media' by a committee in 2022" -> committee_id=[...], disbursement_description='media', two_year_transaction_period=2022`,
      inputSchema: scheduleBInput,
    },
    async (args) => {
      const { cursor, per_page, response_format, ...filters } = args;
      return runSchedule<ScheduleB>(
        "schedules/schedule_b",
        "Itemized Disbursements (Schedule B)",
        filters as QueryParams,
        cursor,
        per_page,
        response_format,
        renderScheduleB,
        "No disbursements found. Add or widen a two_year_transaction_period and check committee_id / recipient filters."
      );
    }
  );

  registerReadOnlyTool(
    server,
    "openfec_search_independent_expenditures",
    {
      title: "Search Independent Expenditures (Schedule E)",
      description: `Search independent expenditures (Schedule E) — spending by committees (often Super PACs) to support or oppose a candidate, made independently of the campaign.

Uses seek pagination: pass the returned next_cursor back via 'cursor' for the next block.

Args:
  - committee_id (string[]): spending committee(s)
  - candidate_id (string[]): targeted candidate(s)
  - support_oppose_indicator ('S'|'O'): supporting or opposing
  - two_year_transaction_period (number): e.g. 2024 (recommended)
  - min_date / max_date (YYYY-MM-DD), min_amount / max_amount (number)
  - sort ('expenditure_date' | 'expenditure_amount', '-' for desc)
  - per_page (1-100), cursor (object), response_format

Returns: independent expenditures with support/oppose stance, targeted candidate, spending committee, amount, date, payee, and purpose. Includes next_cursor when more results exist.

Examples:
  - "Independent expenditures opposing candidate P80003338 in 2024" -> candidate_id=['P80003338'], support_oppose_indicator='O', two_year_transaction_period=2024
  - "Biggest independent expenditures by committee C00575795" -> committee_id=['C00575795'], sort='-expenditure_amount'`,
      inputSchema: scheduleEInput,
    },
    async (args) => {
      const { cursor, per_page, response_format, ...filters } = args;
      return runSchedule<ScheduleE>(
        "schedules/schedule_e",
        "Independent Expenditures (Schedule E)",
        filters as QueryParams,
        cursor,
        per_page,
        response_format,
        renderScheduleE,
        "No independent expenditures found. Check candidate_id / committee_id and consider adding a two_year_transaction_period."
      );
    }
  );
}
