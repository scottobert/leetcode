/**
 * Public, UI-agnostic API for the `du` engine.
 *
 * Front ends (the bundled CLI, or a future GUI) should depend only on this
 * module. The primary entry point is {@link du}; the lower-level stages
 * ({@link walkPaths}, {@link selectEntries}, {@link formatEntries}) are exported
 * too so a richer UI can drive each step itself.
 */

export * from "./types.js";
export { du } from "./du.js";
export { walkPaths, DuError } from "./walk.js";
export { selectEntries } from "./select.js";
export { formatEntries, formatEntry, formatGrandTotal } from "./format.js";
export {
  formatSize,
  humanize,
  parseSize,
  blocksForFileSize,
  blocksToBytes,
  BLOCK_SIZE,
} from "./size.js";
export { ExcludeMatcher } from "./glob.js";
