/**
 * Core type definitions for the `du` engine.
 *
 * The engine is deliberately UI-agnostic: it walks the filesystem and produces
 * plain data structures ({@link FsNode} trees and flat {@link DuEntry} lists).
 * The CLI is one consumer; a future GUI can consume the very same structures
 * (e.g. render the {@link FsNode} tree directly, or drive its own filtering and
 * formatting) without going through text output.
 */

/** Unit used when rendering a size to text. */
export type SizeUnit =
  /** 512-byte blocks — the POSIX default. */
  | "blocks"
  /** 1024-byte kilobytes (`-k`). */
  | "kilobytes"
  /** 1048576-byte megabytes (`-m`). */
  | "megabytes"
  /** Human-readable with a K/M/G/T suffix (`-h`). */
  | "human";

/** Options that affect how the tree is walked and what is counted. */
export interface WalkOptions {
  /** Follow symbolic links and count the target instead of the link (`-L`). */
  followSymlinks?: boolean;
  /**
   * Glob patterns matched against an entry's name (basename). Any file or
   * directory whose name matches is skipped entirely and not counted
   * (`--exclude`). May be specified multiple times.
   */
  exclude?: string[];
}

/** Options that affect which computed entries are shown (presentation only). */
export interface DisplayOptions {
  /** Show an entry for every file, not just directories (`-a`). */
  all?: boolean;
  /** Show only a grand total per argument, no per-directory breakdown (`-s`). */
  summaryOnly?: boolean;
  /**
   * Only show entries at or above this depth-limit relative to each starting
   * path (`-d` / `--max-depth`). `0` behaves like {@link summaryOnly}.
   */
  maxDepth?: number;
  /** Only show entries whose disk usage is at least this many bytes (`-t`). */
  thresholdBytes?: number;
}

/** Options that affect how sizes are rendered to text. */
export interface FormatOptions {
  /** Unit used to render sizes. Defaults to `"blocks"`. */
  unit?: SizeUnit;
}

/** The full set of options accepted by {@link du}. */
export interface DuOptions extends WalkOptions, DisplayOptions, FormatOptions {
  /** Print a grand total line (labelled `total`) at the end (`-c`). */
  grandTotal?: boolean;
}

/**
 * A node in the walked filesystem tree. Directory nodes carry the cumulative
 * disk usage of everything beneath them; file nodes carry their own usage.
 */
export interface FsNode {
  /** Path as it should be displayed (rooted at the path argument given). */
  path: string;
  /** The entry's basename. */
  name: string;
  /** Whether this node is (or, with `-L`, resolves to) a directory. */
  isDirectory: boolean;
  /** Whether the on-disk entry is a symbolic link. */
  isSymbolicLink: boolean;
  /** Cumulative disk usage in 512-byte blocks. */
  blocks: number;
  /** Cumulative disk usage in bytes (`blocks * 512`). */
  bytes: number;
  /** Depth relative to the starting path argument (the root is `0`). */
  depth: number;
  /** Child nodes (empty for files). */
  children: FsNode[];
}

/** A single flattened row destined for output. */
export interface DuEntry {
  /** Path to display. */
  path: string;
  /** Disk usage in 512-byte blocks. */
  blocks: number;
  /** Disk usage in bytes (`blocks * 512`). */
  bytes: number;
  /** Whether the entry is a directory. */
  isDirectory: boolean;
  /** Depth relative to its starting path argument. */
  depth: number;
}

/** The structured result of a {@link du} run. */
export interface DuResult {
  /** One walked tree per path argument, with full cumulative totals. */
  roots: FsNode[];
  /** The flattened, filtered rows in output order. */
  entries: DuEntry[];
  /** Combined disk usage in bytes across all roots, when `grandTotal` is set. */
  grandTotalBytes?: number;
  /** Combined disk usage in blocks across all roots, when `grandTotal` is set. */
  grandTotalBlocks?: number;
  /** The formatted text lines, ready to print (one per entry, plus total). */
  lines: string[];
}
