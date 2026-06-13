import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "../src/cli/main.js";
import { createTestdir } from "./helpers.js";

let workdir: string;
let originalCwd: string;

beforeAll(async () => {
  originalCwd = process.cwd();
  workdir = await mkdtemp(join(tmpdir(), "tsdu-cli-"));
  await createTestdir(join(workdir, "testdir"));
  process.chdir(workdir);
});

afterAll(async () => {
  process.chdir(originalCwd);
  await rm(workdir, { recursive: true, force: true });
});

/** Run the CLI and capture its output streams and exit code. */
async function invoke(argv: string[]): Promise<{
  code: number;
  out: string[];
  err: string[];
}> {
  const out: string[] = [];
  const err: string[] = [];
  const code = await run(argv, {
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
  });
  return { code, out, err };
}

describe("ccdu CLI", () => {
  it("prints the directory breakdown and exits 0", async () => {
    const { code, out, err } = await invoke(["testdir"]);
    expect(code).toBe(0);
    expect(err).toEqual([]);
    expect(out).toEqual([
      "1\ttestdir/subdir1/deep",
      "2\ttestdir/subdir1",
      "1\ttestdir/subdir2",
      "4\ttestdir",
    ]);
  });

  it("honours combined short flags and a grand total", async () => {
    const { out } = await invoke(["-shc", "testdir", "testdir/subdir2"]);
    expect(out).toEqual(["2.0K\ttestdir", "512\ttestdir/subdir2", "2.5K\ttotal"]);
  });

  it("prints help and exits 0", async () => {
    const { code, out } = await invoke(["--help"]);
    expect(code).toBe(0);
    expect(out.join("\n")).toContain("Usage: ccdu");
  });

  it("prints the version and exits 0", async () => {
    const { code, out } = await invoke(["--version"]);
    expect(code).toBe(0);
    expect(out[0]).toMatch(/^tsdu /);
  });

  it("reports usage errors on stderr and exits 2", async () => {
    const { code, out, err } = await invoke(["--bogus"]);
    expect(code).toBe(2);
    expect(out).toEqual([]);
    expect(err[0]).toContain("unknown option");
  });

  it("reports a missing path on stderr and exits 1", async () => {
    const { code, err } = await invoke(["does-not-exist"]);
    expect(code).toBe(1);
    expect(err[0]).toContain("no such file or directory");
  });
});
