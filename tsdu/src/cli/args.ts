/** Command-line argument parser for `ccdu`. */

import { parseSize } from "../core/index.js";
import type { DuOptions } from "../core/index.js";

/** Error raised for malformed command-line input. */
export class ArgError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArgError";
  }
}

/** The result of parsing `ccdu`'s arguments. */
export interface ParsedArgs {
  paths: string[];
  options: DuOptions;
  help: boolean;
  version: boolean;
}

/** Boolean short flags and the option they set. */
const BOOLEAN_FLAGS: Record<string, (options: DuOptions) => void> = {
  s: (o) => void (o.summaryOnly = true),
  c: (o) => void (o.grandTotal = true),
  a: (o) => void (o.all = true),
  L: (o) => void (o.followSymlinks = true),
  h: (o) => void (o.unit = "human"),
  k: (o) => void (o.unit = "kilobytes"),
  m: (o) => void (o.unit = "megabytes"),
};

function parseDepth(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new ArgError(`invalid max-depth: '${value}'`);
  }
  return Number(value);
}

function parseThreshold(value: string): number {
  try {
    return parseSize(value);
  } catch {
    throw new ArgError(`invalid threshold: '${value}'`);
  }
}

/**
 * Parse `ccdu` arguments into structured options. Supports clustered short
 * flags (`-sh`), attached or separated values (`-d1` / `-d 1`), GNU-style long
 * options (`--max-depth=1`), and `--` to end option parsing.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const options: DuOptions = {};
  const paths: string[] = [];
  let help = false;
  let version = false;
  let optionsEnded = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;

    if (optionsEnded || arg === "-" || !arg.startsWith("-")) {
      paths.push(arg);
      continue;
    }

    if (arg === "--") {
      optionsEnded = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const eq = arg.indexOf("=");
      const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
      const inlineValue = eq === -1 ? undefined : arg.slice(eq + 1);
      const takeValue = (): string => {
        if (inlineValue !== undefined) return inlineValue;
        const next = argv[++i];
        if (next === undefined) {
          throw new ArgError(`option '--${name}' requires an argument`);
        }
        return next;
      };

      switch (name) {
        case "help":
          help = true;
          break;
        case "version":
          version = true;
          break;
        case "all":
          options.all = true;
          break;
        case "summarize":
          options.summaryOnly = true;
          break;
        case "total":
          options.grandTotal = true;
          break;
        case "human-readable":
          options.unit = "human";
          break;
        case "dereference":
          options.followSymlinks = true;
          break;
        case "max-depth":
          options.maxDepth = parseDepth(takeValue());
          break;
        case "threshold":
          options.thresholdBytes = parseThreshold(takeValue());
          break;
        case "exclude":
          (options.exclude ??= []).push(takeValue());
          break;
        default:
          throw new ArgError(`unknown option '--${name}'`);
      }
      continue;
    }

    // A cluster of short options, e.g. `-sh` or `-d1`.
    for (let j = 1; j < arg.length; j += 1) {
      const flag = arg[j]!;
      const booleanFlag = BOOLEAN_FLAGS[flag];
      if (booleanFlag) {
        booleanFlag(options);
        continue;
      }
      if (flag === "d" || flag === "t") {
        let value = arg.slice(j + 1);
        if (value === "") {
          const next = argv[++i];
          if (next === undefined) {
            throw new ArgError(`option '-${flag}' requires an argument`);
          }
          value = next;
        }
        if (flag === "d") options.maxDepth = parseDepth(value);
        else options.thresholdBytes = parseThreshold(value);
        break; // the rest of the token was consumed as the value
      }
      throw new ArgError(`unknown option '-${flag}'`);
    }
  }

  return { paths, options, help, version };
}
