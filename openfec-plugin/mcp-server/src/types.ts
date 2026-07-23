/**
 * Shared TypeScript type definitions for the OpenFEC MCP server.
 */

/** Output format supported by every data-returning tool. */
export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

/**
 * Standard offset-based pagination metadata returned by most OpenFEC
 * endpoints (e.g. /candidates, /committees, /filings, /reports).
 */
export interface OffsetPagination {
  count: number;
  page: number;
  pages: number;
  per_page: number;
}

/**
 * Seek/cursor pagination metadata returned by the high-volume itemized
 * schedule endpoints (schedule_a, schedule_b, schedule_e). Instead of a
 * page number, the caller passes back the `last_indexes` values to fetch
 * the next block of records.
 */
export interface SeekPagination {
  count?: number;
  per_page: number;
  pages?: number;
  last_indexes: Record<string, string | number> | null;
}

/** Generic OpenFEC list response envelope. */
export interface OpenFecResponse<T> {
  api_version?: string;
  results: T[];
  pagination: OffsetPagination | SeekPagination;
}

/** Normalized, agent-friendly representation of a paginated response. */
export interface NormalizedPage<T> {
  /** Total number of matching records across all pages (when known). */
  total?: number;
  /** Number of records returned in this response. */
  count: number;
  /** Items in this page. */
  results: T[];
  /** Whether more records are available. */
  has_more: boolean;
  /** Next page number for offset pagination (if applicable). */
  next_page?: number;
  /** Cursor values to pass back for seek pagination (if applicable). */
  next_cursor?: Record<string, string | number> | null;
}
