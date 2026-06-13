#!/usr/bin/env node
/** The `ccdu` command-line entry point. */

import { fileURLToPath } from "node:url";
import { du, DuError } from "../core/index.js";
import { ArgError, parseArgs } from "./args.js";

const VERSION = "tsdu 1.0.0";

const HELP_TEXT = `Usage: ccdu [OPTION]... [PATH]...
Summarise disk usage of each PATH, recursively for directories.
With no PATH, the current directory is used.

  -a               write counts for all files, not just directories
  -s               display only a total for each argument
  -c               produce a grand total
  -h               print sizes in human-readable form (e.g. 1.2M)
  -k               print sizes in 1024-byte kilobytes
  -m               print sizes in megabytes
  -L               follow symbolic links
  -d, --max-depth=N  show entries only N levels deep (-d 0 is like -s)
  -t, --threshold=SIZE  show only entries of SIZE bytes or more (e.g. 1K, 10M)
      --exclude=PATTERN  skip files/directories matching the glob PATTERN
      --help       display this help and exit
      --version    output version information and exit

Sizes default to 512-byte blocks (POSIX).`;

/** Sinks for output, so the command is testable without touching the process. */
export interface RunIO {
  stdout?: (line: string) => void;
  stderr?: (line: string) => void;
}

/**
 * Run the `ccdu` command. Returns the process exit code:
 * `0` on success, `1` if some paths could not be read, `2` on usage errors.
 */
export async function run(argv: string[], io: RunIO = {}): Promise<number> {
  const out = io.stdout ?? ((line) => void process.stdout.write(`${line}\n`));
  const err = io.stderr ?? ((line) => void process.stderr.write(`${line}\n`));

  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (error) {
    err(`ccdu: ${(error as Error).message}`);
    err("Try 'ccdu --help' for more information.");
    return 2;
  }

  if (parsed.help) {
    out(HELP_TEXT);
    return 0;
  }
  if (parsed.version) {
    out(VERSION);
    return 0;
  }

  let hadAccessError = false;
  try {
    const result = await du(parsed.paths, parsed.options, (error) => {
      hadAccessError = true;
      err(`ccdu: ${error.message}`);
    });
    for (const line of result.lines) {
      out(line);
    }
  } catch (error) {
    const message = error instanceof DuError ? error.message : (error as Error).message;
    err(`ccdu: ${message}`);
    return 1;
  }

  return hadAccessError ? 1 : 0;
}

// Execute only when invoked directly (not when imported, e.g. by tests).
const invokedDirectly =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  void run(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
