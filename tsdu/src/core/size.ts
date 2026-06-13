/** Size arithmetic, unit conversion, and glob/size string parsing. */

import type { SizeUnit } from "./types.js";

/** The POSIX disk-usage block size, in bytes. */
export const BLOCK_SIZE = 512;

/**
 * Disk usage of a single file, in 512-byte blocks.
 *
 * Following the challenge's model, this is the apparent file size rounded up to
 * the next whole 512-byte block. An empty file occupies zero blocks.
 */
export function blocksForFileSize(sizeBytes: number): number {
  if (sizeBytes <= 0) return 0;
  return Math.ceil(sizeBytes / BLOCK_SIZE);
}

/** Convert a block count to bytes. */
export function blocksToBytes(blocks: number): number {
  return blocks * BLOCK_SIZE;
}

/**
 * Render a disk-usage value (given in 512-byte blocks) as text in the requested
 * unit. Non-human units round up to a whole unit, matching `du`.
 */
export function formatSize(blocks: number, unit: SizeUnit = "blocks"): string {
  const bytes = blocksToBytes(blocks);
  switch (unit) {
    case "blocks":
      return String(blocks);
    case "kilobytes":
      return String(Math.ceil(bytes / 1024));
    case "megabytes":
      return String(Math.ceil(bytes / (1024 * 1024)));
    case "human":
      return humanize(bytes);
  }
}

/**
 * Format a byte count the way `du -h` does: pick the largest 1024-based unit
 * that keeps the number below 1024, rounding up. Values below 1K are shown as
 * raw bytes; values under 10 of a unit keep one decimal place.
 */
export function humanize(bytes: number): string {
  if (bytes <= 0) return "0";
  const units = ["", "K", "M", "G", "T", "P"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  if (unitIndex === 0) return String(bytes);
  // Round up to one decimal place, as du does.
  const rounded = Math.ceil(value * 10) / 10;
  const text = rounded < 10 ? rounded.toFixed(1) : String(Math.ceil(rounded));
  return `${text}${units[unitIndex]}`;
}

/**
 * Parse a size string such as `1K`, `10M`, `512`, or `2G` into bytes.
 * Suffixes are 1024-based (`K`, `M`, `G`, `T`, `P`); a bare number is bytes.
 *
 * @throws if the string is not a valid size.
 */
export function parseSize(input: string): number {
  const match = /^(\d+(?:\.\d+)?)\s*([kKmMgGtTpP]?)[bB]?$/.exec(input.trim());
  if (!match) {
    throw new Error(`invalid size: '${input}'`);
  }
  const value = Number(match[1]);
  const suffix = (match[2] ?? "").toUpperCase();
  const multipliers: Record<string, number> = {
    "": 1,
    K: 1024,
    M: 1024 ** 2,
    G: 1024 ** 3,
    T: 1024 ** 4,
    P: 1024 ** 5,
  };
  return Math.round(value * multipliers[suffix]!);
}
