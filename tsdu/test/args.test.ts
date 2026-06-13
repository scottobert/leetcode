import { describe, expect, it } from "vitest";
import { ArgError, parseArgs } from "../src/cli/args.js";

describe("parseArgs", () => {
  it("defaults to no paths and no options", () => {
    const { paths, options } = parseArgs([]);
    expect(paths).toEqual([]);
    expect(options).toEqual({});
  });

  it("collects path arguments", () => {
    const { paths } = parseArgs(["testdir", "other"]);
    expect(paths).toEqual(["testdir", "other"]);
  });

  it("parses the unit flags with last-one-wins precedence", () => {
    expect(parseArgs(["-h"]).options.unit).toBe("human");
    expect(parseArgs(["-k"]).options.unit).toBe("kilobytes");
    expect(parseArgs(["-m"]).options.unit).toBe("megabytes");
    expect(parseArgs(["-k", "-h"]).options.unit).toBe("human");
  });

  it("parses boolean flags", () => {
    const { options } = parseArgs(["-s", "-c", "-a", "-L"]);
    expect(options.summaryOnly).toBe(true);
    expect(options.grandTotal).toBe(true);
    expect(options.all).toBe(true);
    expect(options.followSymlinks).toBe(true);
  });

  it("supports clustered short flags", () => {
    const { options, paths } = parseArgs(["-sh", "testdir"]);
    expect(options.summaryOnly).toBe(true);
    expect(options.unit).toBe("human");
    expect(paths).toEqual(["testdir"]);
  });

  it("parses -d with a separate or attached value", () => {
    expect(parseArgs(["-d", "1"]).options.maxDepth).toBe(1);
    expect(parseArgs(["-d0"]).options.maxDepth).toBe(0);
    expect(parseArgs(["--max-depth=2"]).options.maxDepth).toBe(2);
  });

  it("parses -t thresholds with units", () => {
    expect(parseArgs(["-t", "1K"]).options.thresholdBytes).toBe(1024);
    expect(parseArgs(["-t10K"]).options.thresholdBytes).toBe(10240);
    expect(parseArgs(["--threshold=1M"]).options.thresholdBytes).toBe(1024 * 1024);
  });

  it("collects repeated --exclude patterns", () => {
    const { options } = parseArgs(["--exclude", "*.txt", "--exclude=*.log"]);
    expect(options.exclude).toEqual(["*.txt", "*.log"]);
  });

  it("recognises GNU long aliases", () => {
    const { options } = parseArgs(["--all", "--summarize", "--total", "--human-readable"]);
    expect(options.all).toBe(true);
    expect(options.summaryOnly).toBe(true);
    expect(options.grandTotal).toBe(true);
    expect(options.unit).toBe("human");
  });

  it("treats arguments after -- as paths", () => {
    const { paths } = parseArgs(["--", "-weird-name", "-s"]);
    expect(paths).toEqual(["-weird-name", "-s"]);
  });

  it("treats a lone - as a path", () => {
    expect(parseArgs(["-"]).paths).toEqual(["-"]);
  });

  it("flags help and version", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["--version"]).version).toBe(true);
  });

  it("rejects unknown options", () => {
    expect(() => parseArgs(["-z"]).options).toThrow(ArgError);
    expect(() => parseArgs(["--nope"]).options).toThrow(ArgError);
  });

  it("rejects a missing required value", () => {
    expect(() => parseArgs(["-d"])).toThrow(ArgError);
    expect(() => parseArgs(["--exclude"])).toThrow(ArgError);
  });

  it("rejects invalid numeric values", () => {
    expect(() => parseArgs(["-d", "x"])).toThrow(ArgError);
    expect(() => parseArgs(["-t", "nope"])).toThrow(ArgError);
  });
});
