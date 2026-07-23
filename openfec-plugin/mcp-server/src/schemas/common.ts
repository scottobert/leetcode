/**
 * Reusable Zod schema fragments shared across tools (pagination, sorting,
 * response format). These are spread into each tool's input schema.
 */

import { z } from "zod";
import { ResponseFormat } from "../types.js";

/** Response-format selector present on every data-returning tool. */
export const responseFormatField = {
  response_format: z
    .nativeEnum(ResponseFormat)
    .default(ResponseFormat.MARKDOWN)
    .describe(
      "Output format: 'markdown' (default, human-readable) or 'json' (complete structured data)."
    ),
};

/** Offset-based pagination fields (most list endpoints). */
export const offsetPaginationFields = {
  page: z
    .number()
    .int()
    .min(1)
    .default(1)
    .describe("Page number to retrieve (1-based)."),
  per_page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe("Number of results per page (1-100)."),
};

/** Sort field shared by list endpoints (prefix with '-' for descending). */
export const sortField = {
  sort: z
    .string()
    .optional()
    .describe(
      "Field to sort by. Prefix with '-' for descending order (e.g. '-receipt_date', 'name'). Valid fields depend on the endpoint."
    ),
};

/**
 * Two-year transaction period filter used by itemized schedule endpoints.
 * This is the even-numbered year at the end of a two-year cycle (e.g. 2024
 * covers 2023-2024) and is required by the API for efficient querying.
 */
export const twoYearPeriodField = {
  two_year_transaction_period: z
    .number()
    .int()
    .optional()
    .describe(
      "Two-year transaction period (the even end-year of a cycle, e.g. 2024 for 2023-2024). Strongly recommended for itemized queries to bound the result set."
    ),
};
