import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseArgs,
  parseChecksumLine,
  formatLine,
  runCheck,
  run,
} from "../src/md5sum";
import { md5Hex } from "../src/md5";

describe("parseArgs", () => {
  it("collects files when no flags are given", () => {
    const r = parseArgs(["a.txt", "b.txt"]);
    assert.equal(r.help, false);
    assert.equal(r.error, undefined);
    assert.deepEqual(r.options.files, ["a.txt", "b.txt"]);
  });

  it("recognizes -b, -c, -t and long forms", () => {
    const r = parseArgs(["-b", "--check", "file.sum"]);
    assert.equal(r.options.binary, true);
    assert.equal(r.options.check, true);
    assert.deepEqual(r.options.files, ["file.sum"]);
  });

  it("treats - as a filename, not a flag", () => {
    const r = parseArgs(["-"]);
    assert.deepEqual(r.options.files, ["-"]);
  });

  it("supports -- to stop flag parsing", () => {
    const r = parseArgs(["--", "-b"]);
    assert.deepEqual(r.options.files, ["-b"]);
  });

  it("expands grouped short flags", () => {
    const r = parseArgs(["-bc", "sums.md5"]);
    assert.equal(r.options.binary, true);
    assert.equal(r.options.check, true);
    assert.deepEqual(r.options.files, ["sums.md5"]);
  });

  it("reports an error for unknown options", () => {
    const r = parseArgs(["--bogus"]);
    assert.ok(r.error);
  });
});

describe("formatLine", () => {
  it("uses two spaces in text mode", () => {
    assert.equal(formatLine("d41d8cd98f00b204e9800998ecf8427e", "foo", false),
      "d41d8cd98f00b204e9800998ecf8427e  foo");
  });
  it("uses space-asterisk in binary mode", () => {
    assert.equal(formatLine("d41d8cd98f00b204e9800998ecf8427e", "foo", true),
      "d41d8cd98f00b204e9800998ecf8427e *foo");
  });
});

describe("parseChecksumLine", () => {
  it("parses a text-mode line", () => {
    const r = parseChecksumLine("d41d8cd98f00b204e9800998ecf8427e  empty.txt");
    assert.deepEqual(r, { hash: "d41d8cd98f00b204e9800998ecf8427e", binary: false, file: "empty.txt" });
  });
  it("parses a binary-mode line", () => {
    const r = parseChecksumLine("d41d8cd98f00b204e9800998ecf8427e *empty.bin");
    assert.deepEqual(r, { hash: "d41d8cd98f00b204e9800998ecf8427e", binary: true, file: "empty.bin" });
  });
  it("tolerates a trailing CR", () => {
    const r = parseChecksumLine("d41d8cd98f00b204e9800998ecf8427e  empty.txt\r");
    assert.equal(r?.file, "empty.txt");
  });
  it("rejects malformed lines", () => {
    assert.equal(parseChecksumLine("nope"), null);
    assert.equal(parseChecksumLine("d41d8cd98f00b204e9800998ecf8427e empty.txt"), null);
    assert.equal(parseChecksumLine(""), null);
  });
  it("rejects non-hex digests", () => {
    assert.equal(parseChecksumLine("zzz1d8cd98f00b204e9800998ecf8427e  empty.txt"), null);
  });
});

describe("end-to-end against the filesystem", () => {
  let dir: string;

  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "md5sum-test-"));
    await writeFile(join(dir, "empty.txt"), "");
    await writeFile(join(dir, "abc.txt"), "abc");
    await writeFile(join(dir, "bin.dat"), Buffer.from([0, 1, 2, 0xff]));
  });

  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("hashes files matching the standard format", async () => {
    const r = await run([join(dir, "empty.txt"), join(dir, "abc.txt")]);
    assert.equal(r.exitCode, 0);
    assert.equal(r.stdout.length, 2);
    assert.match(r.stdout[0], /^d41d8cd98f00b204e9800998ecf8427e  /);
    assert.match(r.stdout[1], /^900150983cd24fb0d6963f7d28e17f72  /);
  });

  it("emits an asterisk for binary mode", async () => {
    const r = await run(["-b", join(dir, "bin.dat")]);
    assert.equal(r.exitCode, 0);
    assert.match(r.stdout[0], / \*/);
  });

  it("reports an error and non-zero exit for a missing file", async () => {
    const r = await run([join(dir, "nope.txt")]);
    assert.notEqual(r.exitCode, 0);
    assert.ok(r.stderr.join("\n").includes("nope.txt"));
  });

  it("verifies a checksum file with -c", async () => {
    const sums =
      `${md5Hex("")}  ${join(dir, "empty.txt")}\n` +
      `${md5Hex("abc")}  ${join(dir, "abc.txt")}\n`;
    const sumsPath = join(dir, "good.md5");
    await writeFile(sumsPath, sums);
    const r = await run(["-c", sumsPath]);
    assert.equal(r.exitCode, 0);
    assert.ok(r.stdout.some((l) => l.endsWith(": OK")));
    assert.equal(r.stdout.filter((l) => l.endsWith(": OK")).length, 2);
  });

  it("reports FAILED for a mismatched hash", async () => {
    const sums = `00000000000000000000000000000000  ${join(dir, "abc.txt")}\n`;
    const sumsPath = join(dir, "bad.md5");
    await writeFile(sumsPath, sums);
    const r = await run(["-c", sumsPath]);
    assert.notEqual(r.exitCode, 0);
    assert.ok(r.stdout.some((l) => l.endsWith(": FAILED")));
  });

  it("suppresses OK output with --quiet but still reports FAILED", async () => {
    const sums =
      `${md5Hex("")}  ${join(dir, "empty.txt")}\n` +
      `00000000000000000000000000000000  ${join(dir, "abc.txt")}\n`;
    const sumsPath = join(dir, "mix.md5");
    await writeFile(sumsPath, sums);
    const r = await run(["-c", "--quiet", sumsPath]);
    assert.notEqual(r.exitCode, 0);
    assert.ok(!r.stdout.some((l) => l.endsWith(": OK")));
    assert.ok(r.stdout.some((l) => l.endsWith(": FAILED")));
  });

  it("suppresses all output with --status", async () => {
    const sums = `${md5Hex("")}  ${join(dir, "empty.txt")}\n`;
    const sumsPath = join(dir, "status.md5");
    await writeFile(sumsPath, sums);
    const r = await run(["-c", "--status", sumsPath]);
    assert.equal(r.exitCode, 0);
    assert.equal(r.stdout.length, 0);
  });

  it("propagates malformed-line errors when no good lines exist", async () => {
    const sumsPath = join(dir, "junk.md5");
    await writeFile(sumsPath, "not a checksum at all\n");
    const r = await run(["-c", sumsPath]);
    assert.notEqual(r.exitCode, 0);
    assert.ok(
      r.stderr.join("\n").includes("no properly formatted MD5 checksum lines found"),
    );
  });

  it("runCheck reports missing files as FAILED open or read", async () => {
    const sumsPath = join(dir, "missing.md5");
    const fakeFile = join(dir, "ghost.txt");
    await writeFile(sumsPath, `${md5Hex("anything")}  ${fakeFile}\n`);
    const out = await runCheck(sumsPath, { quiet: false, status: false, warn: false });
    assert.equal(out.summary.missing, 1);
    assert.ok(out.lines.some((l) => l.endsWith(": FAILED open or read")));
  });
});
