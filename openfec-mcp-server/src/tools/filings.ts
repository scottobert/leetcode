/**
 * Filings tool: search documents filed with the FEC (financial reports,
 * statements of candidacy/organization, notices, etc.).
 *
 * OpenFEC endpoint:
 *   GET /filings/   — filterable list of all FEC filings
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { normalizePage, openFecRequest } from "../services/client.js";
import { buildPageResult, money, orNA } from "../services/format.js";
import {
  offsetPaginationFields,
  responseFormatField,
  sortField,
} from "../schemas/common.js";
import { registerReadOnlyTool } from "./shared.js";
import type { OpenFecResponse } from "../types.js";

interface Filing {
  committee_id?: string;
  committee_name?: string;
  candidate_id?: string;
  candidate_name?: string;
  form_type?: string;
  document_description?: string;
  receipt_date?: string;
  coverage_start_date?: string;
  coverage_end_date?: string;
  total_receipts?: number;
  total_disbursements?: number;
  cash_on_hand_end_period?: number;
  is_amended?: boolean;
  amendment_indicator_full?: string;
  fec_file_id?: string;
  pdf_url?: string;
}

function renderFiling(f: Filing): string {
  const title =
    f.document_description || f.form_type || "Filing";
  const lines = [`## ${title}`];
  if (f.committee_name || f.committee_id)
    lines.push(`- **Committee**: ${orNA(f.committee_name)} (${orNA(f.committee_id)})`);
  if (f.candidate_name || f.candidate_id)
    lines.push(`- **Candidate**: ${orNA(f.candidate_name)} (${orNA(f.candidate_id)})`);
  if (f.form_type) lines.push(`- **Form type**: ${f.form_type}`);
  if (f.receipt_date) lines.push(`- **Filed**: ${f.receipt_date}`);
  if (f.coverage_start_date || f.coverage_end_date)
    lines.push(
      `- **Coverage**: ${orNA(f.coverage_start_date)} → ${orNA(f.coverage_end_date)}`
    );
  if (f.total_receipts !== undefined)
    lines.push(`- **Total receipts**: ${money(f.total_receipts)}`);
  if (f.total_disbursements !== undefined)
    lines.push(`- **Total disbursements**: ${money(f.total_disbursements)}`);
  if (f.amendment_indicator_full)
    lines.push(`- **Amendment**: ${f.amendment_indicator_full}`);
  if (f.pdf_url) lines.push(`- **PDF**: ${f.pdf_url}`);
  return lines.join("\n");
}

const input = {
  committee_id: z
    .array(z.string())
    .optional()
    .describe("Filter by committee ID(s)."),
  candidate_id: z
    .array(z.string())
    .optional()
    .describe("Filter by candidate ID(s)."),
  form_type: z
    .array(z.string())
    .optional()
    .describe(
      "Form type code(s), e.g. 'F3' (House/Senate report), 'F3P' (presidential report), 'F3X' (PAC/party report), 'F1' (statement of organization), 'F2' (statement of candidacy), 'F24' (independent expenditure notice)."
    ),
  report_type: z
    .array(z.string())
    .optional()
    .describe("Report type code(s), e.g. 'Q1', 'Q2', 'YE', 'M4', '12G'."),
  cycle: z
    .array(z.number().int())
    .optional()
    .describe("Two-year cycle(s) (e.g. [2024])."),
  min_receipt_date: z
    .string()
    .optional()
    .describe("Earliest filing receipt date (YYYY-MM-DD)."),
  max_receipt_date: z
    .string()
    .optional()
    .describe("Latest filing receipt date (YYYY-MM-DD)."),
  is_amended: z
    .boolean()
    .optional()
    .describe("Filter to filings that have been amended."),
  most_recent: z
    .boolean()
    .optional()
    .describe("Return only the most recent version of each filing."),
  ...sortField,
  ...offsetPaginationFields,
  ...responseFormatField,
};

export function registerFilingTools(server: McpServer): void {
  registerReadOnlyTool(
    server,
    "openfec_search_filings",
    {
      title: "Search FEC Filings",
      description: `Search documents filed with the FEC — periodic financial reports (F3/F3P/F3X), statements of organization/candidacy, independent-expenditure notices, and more. Each result links to the source PDF.

Args:
  - committee_id (string[]), candidate_id (string[])
  - form_type (string[]): e.g. 'F3', 'F3P', 'F3X', 'F1', 'F2', 'F24'
  - report_type (string[]): e.g. 'Q1', 'Q2', 'YE', '12G'
  - cycle (number[])
  - min_receipt_date / max_receipt_date (YYYY-MM-DD)
  - is_amended (boolean), most_recent (boolean)
  - sort (e.g. '-receipt_date'), page, per_page, response_format

Returns: paginated filings with committee/candidate, form type, filing & coverage dates, headline totals, amendment status, and pdf_url.

Examples:
  - "What did committee C00401224 file in the 2024 cycle?" -> committee_id=['C00401224'], cycle=[2024], sort='-receipt_date'
  - "Show the most recent presidential reports filed in 2024" -> form_type=['F3P'], cycle=[2024], most_recent=true`,
      inputSchema: input,
    },
    async (args) => {
      const { page, per_page, response_format, ...filters } = args;
      const data = await openFecRequest<OpenFecResponse<Filing>>("filings", {
        ...filters,
        page,
        per_page,
      });
      const norm = normalizePage(data, page);
      return buildPageResult(
        "FEC Filings",
        norm,
        response_format,
        renderFiling,
        "No filings found matching those filters. Widen the date range or remove filters."
      );
    }
  );
}
