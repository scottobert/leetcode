/** Flattens walked trees into the ordered, filtered rows `du` prints. */

import type { DisplayOptions, DuEntry, FsNode } from "./types.js";

/**
 * Flatten walked trees into output rows in `du` order: children before their
 * parents (post-order), with each path argument's total emitted last.
 *
 * Filtering here is purely presentational — the totals were already computed
 * during the walk, so hiding a row never changes any reported size.
 */
export function selectEntries(roots: FsNode[], options: DisplayOptions = {}): DuEntry[] {
  const all = options.all ?? false;
  const threshold = options.thresholdBytes;
  // `-s` is equivalent to a depth limit of 0; an explicit `-d` wins if smaller.
  const depthLimit = resolveDepthLimit(options);

  const entries: DuEntry[] = [];

  const visit = (node: FsNode): void => {
    // Recurse first so deeper entries are emitted before their parent.
    for (const child of node.children) {
      visit(child);
    }

    if (!node.isDirectory && !all) return;
    if (depthLimit !== undefined && node.depth > depthLimit) return;
    if (threshold !== undefined && node.bytes < threshold) return;

    entries.push({
      path: node.path,
      blocks: node.blocks,
      bytes: node.bytes,
      isDirectory: node.isDirectory,
      depth: node.depth,
    });
  };

  for (const root of roots) {
    visit(root);
  }
  return entries;
}

function resolveDepthLimit(options: DisplayOptions): number | undefined {
  const fromSummary = options.summaryOnly ? 0 : undefined;
  const fromDepth = options.maxDepth;
  if (fromSummary === undefined) return fromDepth;
  if (fromDepth === undefined) return fromSummary;
  return Math.min(fromSummary, fromDepth);
}
