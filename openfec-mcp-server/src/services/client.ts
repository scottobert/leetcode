/**
 * Shared OpenFEC API client: authentication, request execution, error
 * handling, and pagination normalization. All tools go through this module
 * so that auth and error semantics stay consistent.
 */

import axios, { AxiosError } from "axios";
import {
  API_BASE_URL,
  API_KEY_ENV,
  DEMO_API_KEY,
  REQUEST_TIMEOUT_MS,
} from "../constants.js";
import type {
  NormalizedPage,
  OffsetPagination,
  OpenFecResponse,
  SeekPagination,
} from "../types.js";

/** Resolve the configured API key, falling back to the shared demo key. */
export function getApiKey(): string {
  return process.env[API_KEY_ENV]?.trim() || DEMO_API_KEY;
}

/**
 * Query parameter value types accepted by the OpenFEC API. Arrays are
 * serialized as repeated query parameters (the API's convention for
 * multi-value filters such as `committee_id`).
 */
export type QueryValue =
  | string
  | number
  | boolean
  | Array<string | number>
  | undefined
  | null;

export type QueryParams = Record<string, QueryValue>;

/**
 * Execute a GET request against an OpenFEC endpoint.
 *
 * @param endpoint  Path relative to the API base (e.g. "candidates" or
 *                  "committee/C00000935/totals"). Leading/trailing slashes
 *                  are optional.
 * @param params    Query parameters (the api_key is added automatically).
 *                  Undefined/null/empty values are dropped so callers can
 *                  pass optional filters directly.
 */
export async function openFecRequest<T = unknown>(
  endpoint: string,
  params: QueryParams = {}
): Promise<T> {
  const path = endpoint.replace(/^\/+|\/+$/g, "");
  const cleaned: QueryParams = { api_key: getApiKey() };

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    cleaned[key] = value;
  }

  const response = await axios.get<T>(`${API_BASE_URL}/${path}/`, {
    params: cleaned,
    timeout: REQUEST_TIMEOUT_MS,
    headers: { Accept: "application/json" },
    // Repeat array params without index brackets: committee_id=A&committee_id=B
    paramsSerializer: {
      indexes: null,
    },
  });

  return response.data;
}

/** Type guard distinguishing seek pagination from offset pagination. */
function isSeekPagination(
  pagination: OffsetPagination | SeekPagination
): pagination is SeekPagination {
  return (
    pagination !== null &&
    typeof pagination === "object" &&
    "last_indexes" in pagination
  );
}

/**
 * Normalize an OpenFEC list response into a consistent, agent-friendly page
 * object regardless of whether the endpoint uses offset or seek pagination.
 */
export function normalizePage<T>(
  data: OpenFecResponse<T>,
  requestedPage?: number
): NormalizedPage<T> {
  const results = data.results ?? [];
  const pagination = data.pagination;

  if (pagination && isSeekPagination(pagination)) {
    const lastIndexes = pagination.last_indexes ?? null;
    const hasMore =
      lastIndexes !== null && Object.keys(lastIndexes).length > 0;
    return {
      ...(pagination.count !== undefined ? { total: pagination.count } : {}),
      count: results.length,
      results,
      has_more: hasMore,
      next_cursor: hasMore ? lastIndexes : null,
    };
  }

  const offset = (pagination as OffsetPagination) ?? undefined;
  const total = offset?.count;
  const page = requestedPage ?? offset?.page ?? 1;
  const pages = offset?.pages ?? 1;
  const hasMore = page < pages;

  return {
    ...(total !== undefined ? { total } : {}),
    count: results.length,
    results,
    has_more: hasMore,
    ...(hasMore ? { next_page: page + 1 } : {}),
  };
}

/**
 * Convert any error thrown during an API call into a clear, actionable
 * message for the agent. Never leaks internal stack traces.
 */
export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; error?: string }>;
    if (axiosError.response) {
      const status = axiosError.response.status;
      const apiMessage =
        axiosError.response.data?.message ||
        axiosError.response.data?.error;
      switch (status) {
        case 400:
          return `Error: Bad request (400). The OpenFEC API rejected the parameters${
            apiMessage ? `: ${apiMessage}` : ""
          }. Check that IDs, dates (YYYY-MM-DD), and enum values are valid.`;
        case 401:
        case 403:
          return `Error: Authentication failed (${status}). Set a valid API key in the ${API_KEY_ENV} environment variable. Get a free key at https://api.open.fec.gov/developers/.`;
        case 404:
          return "Error: Not found (404). Check that the candidate_id / committee_id exists (e.g. 'P80003338', 'C00401224').";
        case 422:
          return `Error: Unprocessable parameters (422)${
            apiMessage ? `: ${apiMessage}` : ""
          }. Verify filter values and formats.`;
        case 429:
          return "Error: Rate limit exceeded (429). The DEMO_KEY allows only a few requests/hour; set a personal key in OPENFEC_API_KEY, or wait before retrying.";
        default:
          return `Error: OpenFEC API request failed with status ${status}${
            apiMessage ? `: ${apiMessage}` : ""
          }.`;
      }
    }
    if (axiosError.code === "ECONNABORTED") {
      return "Error: Request timed out. The OpenFEC API can be slow for large itemized queries — narrow your filters (dates, amounts, committee_id) and try again.";
    }
    if (axiosError.code === "ENOTFOUND" || axiosError.code === "ECONNREFUSED") {
      return "Error: Could not reach api.open.fec.gov. Check network connectivity.";
    }
  }
  return `Error: Unexpected error: ${
    error instanceof Error ? error.message : String(error)
  }`;
}
