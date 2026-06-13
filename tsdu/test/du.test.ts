import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { link, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { du } from "../src/core/index.js";
import { createTestdir } from "./helpers.js";

let workdir: string;
let originalCwd: string;

beforeAll(async () => {
  originalCwd = process.cwd();
  workdir = await mkdtemp(join(tmpdir(), "tsdu-du-"));
  await createTestdir(join(workdir, "testdir"));
  process.chdir(workdir);
});

afterAll(async () => {
  process.chdir(originalCwd);
  await rm(workdir, { recursive: true, force: true });
});

const lines = async (paths: string[], options = {}) =>
  (await du(paths, options)).lines;

describe("Step 1 — recursive directory totals in 512-byte blocks", () => {
  it("prints each directory, deepest first, root last", async () => {
    expect(await lines(["testdir"])).toEqual([
      "1\ttestdir/subdir1/deep",
      "2\ttestdir/subdir1",
      "1\ttestdir/subdir2",
      "4\ttestdir",
    ]);
  });

  it("defaults to the current directory when no path is given", async () => {
    const result = await lines([]);
    expect(result.at(-1)).toBe("4\t.");
    expect(result[0]?.startsWith("1\t./testdir")).toBe(true);
  });
});

describe("Step 2 — size unit flags", () => {
  it("-h shows human-readable sizes", async () => {
    expect(await lines(["testdir"], { unit: "human" })).toEqual([
      "512\ttestdir/subdir1/deep",
      "1.0K\ttestdir/subdir1",
      "512\ttestdir/subdir2",
      "2.0K\ttestdir",
    ]);
  });

  it("-k shows kilobytes (rounded up)", async () => {
    expect(await lines(["testdir"], { unit: "kilobytes" })).toEqual([
      "1\ttestdir/subdir1/deep",
      "1\ttestdir/subdir1",
      "1\ttestdir/subdir2",
      "2\ttestdir",
    ]);
  });

  it("-m shows megabytes (rounded up)", async () => {
    expect(await lines(["testdir"], { unit: "megabytes" })).toEqual([
      "1\ttestdir/subdir1/deep",
      "1\ttestdir/subdir1",
      "1\ttestdir/subdir2",
      "1\ttestdir",
    ]);
  });
});

describe("Step 3 — summary (-s)", () => {
  it("shows a single total for one path", async () => {
    expect(await lines(["testdir"], { summaryOnly: true })).toEqual(["4\ttestdir"]);
  });

  it("shows one summary line per path", async () => {
    expect(await lines(["testdir", "testdir/subdir1"], { summaryOnly: true })).toEqual([
      "4\ttestdir",
      "2\ttestdir/subdir1",
    ]);
  });
});

describe("Step 4 — grand total (-c)", () => {
  it("appends a total line summing all paths", async () => {
    expect(
      await lines(["testdir", "testdir/subdir1", "testdir/subdir2"], {
        summaryOnly: true,
        grandTotal: true,
      }),
    ).toEqual(["4\ttestdir", "2\ttestdir/subdir1", "1\ttestdir/subdir2", "7\ttotal"]);
  });
});

describe("Step 5 — all files (-a)", () => {
  it("interleaves file entries with directory totals", async () => {
    expect(await lines(["testdir"], { all: true })).toEqual([
      "1\ttestdir/file1.txt",
      "1\ttestdir/subdir1/deep/file3.txt",
      "1\ttestdir/subdir1/deep",
      "1\ttestdir/subdir1/file2.txt",
      "2\ttestdir/subdir1",
      "1\ttestdir/subdir2/file4.txt",
      "1\ttestdir/subdir2",
      "4\ttestdir",
    ]);
  });
});

describe("Step 6 — max depth (-d)", () => {
  it("-d 0 behaves like -s", async () => {
    expect(await lines(["testdir"], { maxDepth: 0 })).toEqual(["4\ttestdir"]);
  });

  it("-d 1 shows the root and its immediate children only", async () => {
    expect(await lines(["testdir"], { maxDepth: 1 })).toEqual([
      "2\ttestdir/subdir1",
      "1\ttestdir/subdir2",
      "4\ttestdir",
    ]);
  });
});

describe("Step 7 — exclude (--exclude)", () => {
  it("skips matching files so totals drop to zero", async () => {
    expect(await lines(["testdir"], { all: true, exclude: ["*.txt"] })).toEqual([
      "0\ttestdir/subdir1/deep",
      "0\ttestdir/subdir1",
      "0\ttestdir/subdir2",
      "0\ttestdir",
    ]);
  });
});

describe("Step 8 — follow symlinks (-L)", () => {
  it("counts the link target's contents only when -L is set", async () => {
    const dir = join(workdir, "symtest");
    await createTestdir(join(dir, "testdir"));
    // Point at content *outside* the tree so inode de-dup doesn't collapse it.
    await mkdir(join(dir, "external"), { recursive: true });
    await writeFile(join(dir, "external", "big.bin"), "x".repeat(4096));
    await symlink(join(dir, "external"), join(dir, "testdir", "link-to-external"));

    const withoutL = await du(["symtest/testdir"], { summaryOnly: true });
    const withL = await du(["symtest/testdir"], {
      summaryOnly: true,
      followSymlinks: true,
    });

    // Without -L the link counts as the tiny link itself; with -L it adds the
    // 4 KiB target, so the total is strictly larger.
    expect(withL.roots[0]!.blocks).toBeGreaterThan(withoutL.roots[0]!.blocks);
  });
});

describe("Step 9 — hard-link de-duplication", () => {
  it("counts a hard-linked inode only once and hides the later link", async () => {
    const dir = join(workdir, "hardtest", "testdir");
    await mkdir(join(dir, "subdir2"), { recursive: true });
    await writeFile(join(dir, "file1.txt"), "hello world\n");
    await link(join(dir, "file1.txt"), join(dir, "subdir2", "hardlink-to-file1.txt"));

    const result = await du(["hardtest/testdir"], { all: true });
    const paths = result.entries.map((e) => e.path);

    expect(paths).toContain("hardtest/testdir/file1.txt");
    expect(paths).not.toContain("hardtest/testdir/subdir2/hardlink-to-file1.txt");
    // Only one block is counted for the shared inode.
    expect(result.roots[0]!.blocks).toBe(1);
  });
});

describe("Step 10 — threshold (-t)", () => {
  it("shows only entries at or above the threshold", async () => {
    // deep=512, subdir1=1024, subdir2=512, testdir=2048 bytes.
    expect(await lines(["testdir"], { thresholdBytes: 1024 })).toEqual([
      "2\ttestdir/subdir1",
      "4\ttestdir",
    ]);
  });
});
