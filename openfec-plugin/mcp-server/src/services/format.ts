/**
 * Shared response-formatting helpers. Builds MCP tool results with both a
 * text representation (markdown or JSON) and structured content, and enforces
 * the character limit with graceful truncation.
 */

import { CHARACTER_LIMIT } from "../constants.js";
import { ResponseFormat } from "../types.js";
import type { NormalizedPage } from "../types.js";

/** Shape of an MCP tool result returned by every tool in this server. */
export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

/** Build an error tool result with a clear message. */
export function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

/** Format a numeric dollar amount, or "N/A" when missing. */
export function money(value: unknown): string {
  if (value === null || value === undefined || value === "") return "N/A";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return String(value);
  return num.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

/** Render "value" or a placeholder when the value is empty/missing. */
export function orNA(value: unknown): string {
  if (value === null || value === undefined || value === "") return "N/A";
  return String(value);
}

/**
 * Build a tool result from a normalized page of records.
 *
 * @param title          Human-readable heading for markdown output.
 * @param page           Normalized pagination page.
 * @param format         Requested response format.
 * @param renderItem     Renders a single record as a markdown block.
 * @param emptyMessage   Message shown when there are no results.
 */
export function buildPageResult<T>(
  title: string,
  page: NormalizedPage<T>,
  format: ResponseFormat,
  renderItem: (item: T, index: number) => string,
  emptyMessage: string
): ToolResult {
  const structured: Record<string, unknown> = {
    total: page.total,
    count: page.count,
    has_more: page.has_more,
    next_page: page.next_page,
    next_cursor: page.next_cursor,
    results: page.results,
  };

  if (page.count === 0) {
    return {
      content: [{ type: "text", text: emptyMessage }],
      structuredContent: structured,
    };
  }

  let text: string;
  if (format === ResponseFormat.JSON) {
    text = JSON.stringify(structured, null, 2);
  } else {
    const lines: string[] = [`# ${title}`, ""];
    if (page.total !== undefined) {
      lines.push(
        `Found ${page.total.toLocaleString("en-US")} matching records (showing ${page.count}).`
      );
    } else {
      lines.push(`Showing ${page.count} records.`);
    }
    if (page.has_more) {
      if (page.next_page !== undefined) {
        lines.push(`More available — request page ${page.next_page} to continue.`);
      } else if (page.next_cursor) {
        lines.push(
          `More available — pass the returned cursor values to continue: ${JSON.stringify(
            page.next_cursor
          )}`
        );
      }
    }
    lines.push("");
    page.results.forEach((item, index) => {
      lines.push(renderItem(item, index));
      lines.push("");
    });
    text = lines.join("\n");
  }

  return {
    content: [{ type: "text", text: enforceLimit(text, structured) }],
    structuredContent: structured,
  };
}

/**
 * Build a tool result for a single record.
 */
export function buildSingleResult(
  format: ResponseFormat,
  markdown: string,
  structured: Record<string, unknown>
): ToolResult {
  const text =
    format === ResponseFormat.JSON
      ? JSON.stringify(structured, null, 2)
      : markdown;
  return {
    content: [{ type: "text", text: enforceLimit(text, structured) }],
    structuredContent: structured,
  };
}

/**
 * Truncate text that exceeds CHARACTER_LIMIT, appending an actionable
 * message. The structured content is annotated so callers still know the
 * response was cut.
 */
export function enforceLimit(
  text: string,
  structured?: Record<string, unknown>
): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  const notice =
    "\n\n---\n**Response truncated** — it exceeded the size limit. " +
    "Reduce `per_page`, add filters, or set `response_format='json'` and request specific pages to see the full data.";
  if (structured) {
    structured.truncated = true;
  }
  const budget = CHARACTER_LIMIT - notice.length;
  return text.slice(0, Math.max(0, budget)) + notice;
}
