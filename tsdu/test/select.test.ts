import { describe, expect, it } from "vitest";
import { selectEntries } from "../src/core/select.js";
import type { FsNode } from "../src/core/types.js";

/** Build a synthetic FsNode tree mirroring the challenge's testdir. */
function makeTree(): FsNode {
  const file = (path: string, name: string, depth: number, blocks: number): FsNode => ({
    path,
    name,
    depth,
    blocks,
    bytes: blocks * 512,
    isDirectory: false,
    isSymbolicLink: false,
    children: [],
  });
  const dir = (
    path: string,
    name: string,
    depth: number,
    children: FsNode[],
  ): FsNode => ({
    path,
    name,
    depth,
    blocks: children.reduce((s, c) => s + c.blocks, 0),
    bytes: children.reduce((s, c) => s + c.bytes, 0),
    isDirectory: true,
    isSymbolicLink: false,
    children,
  });

  const deep = dir("testdir/subdir1/deep", "deep", 2, [
    file("testdir/subdir1/deep/file3.txt", "file3.txt", 3, 1),
  ]);
  const subdir1 = dir("testdir/subdir1", "subdir1", 1, [
    deep,
    file("testdir/subdir1/file2.txt", "file2.txt", 2, 1),
  ]);
  const subdir2 = dir("testdir/subdir2", "subdir2", 1, [
    file("testdir/subdir2/file4.txt", "file4.txt", 2, 1),
  ]);
  return dir("testdir", "testdir", 0, [
    file("testdir/file1.txt", "file1.txt", 1, 1),
    subdir1,
    subdir2,
  ]);
}

const paths = (tree: FsNode, opts = {}) =>
  selectEntries([tree], opts).map((e) => e.path);

describe("selectEntries", () => {
  it("emits directories post-order, deepest first, root last (Step 1)", () => {
    expect(paths(makeTree())).toEqual([
      "testdir/subdir1/deep",
      "testdir/subdir1",
      "testdir/subdir2",
      "testdir",
    ]);
  });

  it("includes files when 'all' is set (Step 5)", () => {
    expect(paths(makeTree(), { all: true })).toEqual([
      "testdir/file1.txt",
      "testdir/subdir1/deep/file3.txt",
      "testdir/subdir1/deep",
      "testdir/subdir1/file2.txt",
      "testdir/subdir1",
      "testdir/subdir2/file4.txt",
      "testdir/subdir2",
      "testdir",
    ]);
  });

  it("shows only the root total with summaryOnly (Step 3)", () => {
    expect(paths(makeTree(), { summaryOnly: true })).toEqual(["testdir"]);
  });

  it("limits output with maxDepth; depth 0 equals summary (Step 6)", () => {
    expect(paths(makeTree(), { maxDepth: 0 })).toEqual(["testdir"]);
    expect(paths(makeTree(), { maxDepth: 1 })).toEqual([
      "testdir/subdir1",
      "testdir/subdir2",
      "testdir",
    ]);
  });

  it("does not show files at maxDepth even with 'all'", () => {
    // file1.txt is at depth 1 but is a file; with -d 1 -a it still appears.
    expect(paths(makeTree(), { maxDepth: 1, all: true })).toEqual([
      "testdir/file1.txt",
      "testdir/subdir1",
      "testdir/subdir2",
      "testdir",
    ]);
  });

  it("filters entries below the byte threshold (Step 10)", () => {
    // deep=512, subdir1=1024, subdir2=512, testdir=2048 bytes.
    const entries = selectEntries([makeTree()], { thresholdBytes: 1024 });
    expect(entries.map((e) => e.path)).toEqual(["testdir/subdir1", "testdir"]);
  });

  it("keeps the computed total even when children are hidden", () => {
    // file1(1) + subdir1(2) + subdir2(1) = 4 blocks.
    const [summary] = selectEntries([makeTree()], { summaryOnly: true });
    expect(summary?.blocks).toBe(4);
  });
});
