import { describe, expect, it } from "vitest";
import {
  blocksForFileSize,
  blocksToBytes,
  formatSize,
  humanize,
  parseSize,
} from "../src/core/size.js";

describe("blocksForFileSize", () => {
  it("treats empty files as zero blocks", () => {
    expect(blocksForFileSize(0)).toBe(0);
  });

  it("rounds a partial block up to a whole block", () => {
    expect(blocksForFileSize(1)).toBe(1);
    expect(blocksForFileSize(512)).toBe(1);
    expect(blocksForFileSize(513)).toBe(2);
    expect(blocksForFileSize(1024)).toBe(2);
  });
});

describe("formatSize", () => {
  it("prints raw 512-byte blocks by default", () => {
    expect(formatSize(32)).toBe("32");
    expect(formatSize(32, "blocks")).toBe("32");
  });

  it("rounds up to kilobytes for -k", () => {
    // 3 blocks = 1536 bytes -> 2 KiB (rounded up).
    expect(formatSize(3, "kilobytes")).toBe("2");
    expect(formatSize(2, "kilobytes")).toBe("1");
  });

  it("rounds up to megabytes for -m", () => {
    // 2048 blocks = 1 MiB exactly.
    expect(formatSize(2048, "megabytes")).toBe("1");
    expect(formatSize(2049, "megabytes")).toBe("2");
  });

  it("formats human-readable sizes for -h", () => {
    expect(formatSize(8, "human")).toBe("4.0K"); // 4096 bytes
  });
});

describe("humanize", () => {
  it("returns 0 for empty usage", () => {
    expect(humanize(0)).toBe("0");
  });

  it("shows raw bytes below 1K", () => {
    expect(humanize(512)).toBe("512");
  });

  it("shows one decimal place below ten units", () => {
    expect(humanize(4096)).toBe("4.0K");
    expect(humanize(1.2 * 1024 * 1024)).toBe("1.2M");
  });

  it("drops the decimal at or above ten units and rounds up", () => {
    expect(humanize(15 * 1024)).toBe("15K");
    expect(humanize(15 * 1024 + 1)).toBe("16K");
  });
});

describe("parseSize", () => {
  it("parses bare byte counts", () => {
    expect(parseSize("512")).toBe(512);
  });

  it("parses 1024-based suffixes", () => {
    expect(parseSize("1K")).toBe(1024);
    expect(parseSize("10K")).toBe(10240);
    expect(parseSize("1M")).toBe(1024 * 1024);
    expect(parseSize("2G")).toBe(2 * 1024 ** 3);
  });

  it("is case-insensitive and tolerates a trailing B", () => {
    expect(parseSize("1k")).toBe(1024);
    expect(parseSize("1KB")).toBe(1024);
  });

  it("throws on invalid input", () => {
    expect(() => parseSize("abc")).toThrow();
    expect(() => parseSize("")).toThrow();
  });
});

describe("blocksToBytes", () => {
  it("multiplies by the block size", () => {
    expect(blocksToBytes(2)).toBe(1024);
  });
});
