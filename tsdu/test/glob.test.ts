import { describe, expect, it } from "vitest";
import { ExcludeMatcher } from "../src/core/glob.js";

describe("ExcludeMatcher", () => {
  it("is empty with no patterns and matches nothing", () => {
    const matcher = new ExcludeMatcher();
    expect(matcher.isEmpty).toBe(true);
    expect(matcher.matches("anything.txt")).toBe(false);
  });

  it("matches a trailing-wildcard extension pattern", () => {
    const matcher = new ExcludeMatcher(["*.txt"]);
    expect(matcher.matches("file1.txt")).toBe(true);
    expect(matcher.matches("file1.log")).toBe(false);
  });

  it("matches a leading-wildcard prefix pattern", () => {
    const matcher = new ExcludeMatcher(["tmp*"]);
    expect(matcher.matches("tmpfile")).toBe(true);
    expect(matcher.matches("nottmp")).toBe(false);
  });

  it("supports the single-character wildcard", () => {
    const matcher = new ExcludeMatcher(["file?.txt"]);
    expect(matcher.matches("file1.txt")).toBe(true);
    expect(matcher.matches("file12.txt")).toBe(false);
  });

  it("matches if any of several patterns matches", () => {
    const matcher = new ExcludeMatcher(["*.log", "tmp*"]);
    expect(matcher.matches("server.log")).toBe(true);
    expect(matcher.matches("tmpdir")).toBe(true);
    expect(matcher.matches("keep.txt")).toBe(false);
  });

  it("treats dots literally", () => {
    const matcher = new ExcludeMatcher(["a.b"]);
    expect(matcher.matches("a.b")).toBe(true);
    expect(matcher.matches("axb")).toBe(false);
  });
});
