/** Renders flattened entries into the tab-separated lines `du` prints. */

import { formatSize } from "./size.js";
import type { DuEntry, FormatOptions } from "./types.js";

/** Format a single entry as `<size>\t<path>`. */
export function formatEntry(entry: DuEntry, options: FormatOptions = {}): string {
  return `${formatSize(entry.blocks, options.unit)}\t${entry.path}`;
}

/** Format the grand-total line as `<size>\ttotal`. */
export function formatGrandTotal(totalBlocks: number, options: FormatOptions = {}): string {
  return `${formatSize(totalBlocks, options.unit)}\ttotal`;
}

/** Format every entry into lines, ready to print. */
export function formatEntries(entries: DuEntry[], options: FormatOptions = {}): string[] {
  return entries.map((entry) => formatEntry(entry, options));
}
