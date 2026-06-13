/** High-level entry point that ties walking, selection, and formatting together. */

import { formatEntries, formatGrandTotal } from "./format.js";
import { selectEntries } from "./select.js";
import { blocksToBytes } from "./size.js";
import { DuError, walkPaths } from "./walk.js";
import type { DuOptions, DuResult } from "./types.js";

/**
 * Run the disk-usage analysis for a set of path arguments.
 *
 * This is the single function a GUI (or any other front end) should call: it
 * returns the structured {@link DuResult} — the walked trees, the flattened
 * rows, an optional grand total, and the ready-to-print text lines — so the
 * caller can render whichever representation it likes.
 *
 * @param paths Path arguments. Defaults to the current directory when empty.
 */
export async function du(
  paths: string[],
  options: DuOptions = {},
  onError?: (error: DuError) => void,
): Promise<DuResult> {
  const targets = paths.length > 0 ? paths : ["."];

  const roots = await walkPaths(targets, {
    followSymlinks: options.followSymlinks,
    exclude: options.exclude,
    onError,
  });

  const entries = selectEntries(roots, {
    all: options.all,
    summaryOnly: options.summaryOnly,
    maxDepth: options.maxDepth,
    thresholdBytes: options.thresholdBytes,
  });

  const lines = formatEntries(entries, { unit: options.unit });

  const result: DuResult = { roots, entries, lines };

  if (options.grandTotal) {
    const grandTotalBlocks = roots.reduce((sum, root) => sum + root.blocks, 0);
    result.grandTotalBlocks = grandTotalBlocks;
    result.grandTotalBytes = blocksToBytes(grandTotalBlocks);
    lines.push(formatGrandTotal(grandTotalBlocks, { unit: options.unit }));
  }

  return result;
}
