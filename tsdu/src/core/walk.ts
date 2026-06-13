/** Filesystem traversal: builds {@link FsNode} trees with cumulative usage. */

import { lstat, readdir, stat } from "node:fs/promises";
import { basename } from "node:path";
import type { Stats } from "node:fs";
import { ExcludeMatcher } from "./glob.js";
import { blocksForFileSize, blocksToBytes } from "./size.js";
import type { FsNode, WalkOptions } from "./types.js";

/** Error raised when a path cannot be accessed during a walk. */
export class DuError extends Error {
  constructor(
    readonly path: string,
    override readonly cause: unknown,
  ) {
    const reason =
      cause instanceof Error && "code" in cause
        ? describeCode((cause as NodeJS.ErrnoException).code)
        : "cannot access";
    super(`${reason}: '${path}'`);
    this.name = "DuError";
  }
}

function describeCode(code: string | undefined): string {
  switch (code) {
    case "ENOENT":
      return "no such file or directory";
    case "EACCES":
      return "permission denied";
    case "ENOTDIR":
      return "not a directory";
    default:
      return "cannot access";
  }
}

interface WalkContext {
  exclude: ExcludeMatcher;
  followSymlinks: boolean;
  /**
   * Inodes already counted, so hard links are only counted once. Reset per
   * path argument so overlapping arguments each report their full size, while
   * hard links within a single tree are still de-duplicated.
   */
  seenInodes: Set<string>;
  /**
   * Directory inodes on the current descent path. Used to break symlink
   * cycles (a link pointing back to an ancestor) without preventing `-L` from
   * legitimately counting the same target reached via different paths.
   */
  ancestors: Set<string>;
  /** Optional sink for non-fatal access errors (mirrors du's behaviour). */
  onError?: (error: DuError) => void;
}

function inodeKey(st: Stats): string {
  return `${st.dev}:${st.ino}`;
}

function joinDisplay(parent: string, name: string): string {
  return parent.endsWith("/") ? `${parent}${name}` : `${parent}/${name}`;
}

function stripTrailingSlash(p: string): string {
  if (p.length > 1 && p.endsWith("/")) return p.replace(/\/+$/, "");
  return p;
}

function makeNode(
  path: string,
  name: string,
  depth: number,
  blocks: number,
  isDirectory: boolean,
  isSymbolicLink: boolean,
  children: FsNode[] = [],
): FsNode {
  return {
    path,
    name,
    depth,
    blocks,
    bytes: blocksToBytes(blocks),
    isDirectory,
    isSymbolicLink,
    children,
  };
}

/**
 * Walk every path argument, returning one tree per argument with fully
 * computed cumulative totals. Hard-linked files are counted once across the
 * whole run.
 */
export async function walkPaths(
  paths: string[],
  options: WalkOptions & { onError?: (error: DuError) => void } = {},
): Promise<FsNode[]> {
  const ctx: WalkContext = {
    exclude: new ExcludeMatcher(options.exclude),
    followSymlinks: options.followSymlinks ?? false,
    seenInodes: new Set(),
    ancestors: new Set(),
    onError: options.onError,
  };

  const roots: FsNode[] = [];
  for (const arg of paths) {
    // Each argument is de-duplicated independently of the others.
    ctx.seenInodes = new Set();
    ctx.ancestors = new Set();
    const display = stripTrailingSlash(arg);
    try {
      const node = await walkEntry(display, basename(display) || display, 0, ctx);
      if (node) roots.push(node);
    } catch (error) {
      if (error instanceof DuError && ctx.onError) {
        ctx.onError(error);
      } else {
        throw error;
      }
    }
  }
  return roots;
}

async function walkEntry(
  path: string,
  name: string,
  depth: number,
  ctx: WalkContext,
): Promise<FsNode | null> {
  let linkStat: Stats;
  try {
    linkStat = await lstat(path);
  } catch (error) {
    throw new DuError(path, error);
  }

  const isSymlink = linkStat.isSymbolicLink();

  // By default a symlink is reported as the link itself, not its target.
  if (isSymlink && !ctx.followSymlinks) {
    return makeNode(path, name, depth, blocksForFileSize(linkStat.size), false, true);
  }

  // Resolve the real target (following the link when -L is set).
  let resolved: Stats;
  try {
    resolved = isSymlink ? await stat(path) : linkStat;
  } catch (error) {
    // Dangling symlink: report it and skip.
    throw new DuError(path, error);
  }

  if (resolved.isDirectory()) {
    return walkDirectory(path, name, depth, resolved, isSymlink, ctx);
  }
  return walkFile(path, name, depth, resolved, isSymlink, ctx);
}

function walkFile(
  path: string,
  name: string,
  depth: number,
  st: Stats,
  isSymlink: boolean,
  ctx: WalkContext,
): FsNode | null {
  // Skip files whose inode we have already counted (hard-link dedup).
  const key = inodeKey(st);
  if (ctx.seenInodes.has(key)) return null;
  ctx.seenInodes.add(key);
  return makeNode(path, name, depth, blocksForFileSize(st.size), false, isSymlink);
}

async function walkDirectory(
  path: string,
  name: string,
  depth: number,
  st: Stats,
  isSymlink: boolean,
  ctx: WalkContext,
): Promise<FsNode> {
  // Guard against symlink-induced cycles: if this directory is already on the
  // current descent path, stop here rather than recursing forever.
  const key = inodeKey(st);
  if (ctx.followSymlinks && ctx.ancestors.has(key)) {
    return makeNode(path, name, depth, 0, true, isSymlink);
  }

  let names: string[];
  try {
    names = await readdir(path);
  } catch (error) {
    // Report (e.g. permission denied) but keep the directory in the output.
    const duError = new DuError(path, error);
    if (ctx.onError) ctx.onError(duError);
    else throw duError;
    return makeNode(path, name, depth, 0, true, isSymlink);
  }

  ctx.ancestors.add(key);
  const children: FsNode[] = [];
  for (const childName of names.sort()) {
    if (ctx.exclude.matches(childName)) continue;
    const child = await walkEntry(joinDisplay(path, childName), childName, depth + 1, ctx);
    if (child) children.push(child);
  }
  ctx.ancestors.delete(key);

  const blocks = children.reduce((sum, child) => sum + child.blocks, 0);
  return makeNode(path, name, depth, blocks, true, isSymlink, children);
}
