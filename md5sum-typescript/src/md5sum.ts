import { createReadStream } from "node:fs";
import { open } from "node:fs/promises";
import { Md5 } from "./md5";

export interface Options {
  binary: boolean;
  check: boolean;
  quiet: boolean;
  status: boolean;
  strict: boolean;
  warn: boolean;
  files: string[];
}

export interface ParseResult {
  options: Options;
  help: boolean;
  error?: string;
}

const HELP = `Usage: md5sum [OPTION]... [FILE]...
Print or check MD5 (128-bit) checksums.

With no FILE, or when FILE is -, read standard input.

  -b, --binary         read in binary mode
  -c, --check          read checksums from the FILEs and check them
  -t, --text           read in text mode (default)
      --quiet          don't print OK for each successfully verified file
      --status         don't output anything, status code shows success
      --strict         exit non-zero for improperly formatted checksum lines
  -w, --warn           warn about improperly formatted checksum lines
      --help           display this help and exit
`;

export function parseArgs(argv: readonly string[]): ParseResult {
  const opts: Options = {
    binary: false,
    check: false,
    quiet: false,
    status: false,
    strict: false,
    warn: false,
    files: [],
  };
  let i = 0;
  let endOfFlags = false;

  while (i < argv.length) {
    const a = argv[i];
    if (endOfFlags || a === "-" || !a.startsWith("-")) {
      opts.files.push(a);
      i++;
      continue;
    }
    if (a === "--") {
      endOfFlags = true;
      i++;
      continue;
    }
    if (a === "--help") return { options: opts, help: true };
    if (a === "--binary" || a === "-b") opts.binary = true;
    else if (a === "--text" || a === "-t") opts.binary = false;
    else if (a === "--check" || a === "-c") opts.check = true;
    else if (a === "--quiet") opts.quiet = true;
    else if (a === "--status") opts.status = true;
    else if (a === "--strict") opts.strict = true;
    else if (a === "--warn" || a === "-w") opts.warn = true;
    else if (a.startsWith("-") && a.length > 1 && !a.startsWith("--")) {
      // Allow grouped short flags like -bc
      for (const ch of a.slice(1)) {
        if (ch === "b") opts.binary = true;
        else if (ch === "t") opts.binary = false;
        else if (ch === "c") opts.check = true;
        else if (ch === "w") opts.warn = true;
        else return { options: opts, help: false, error: `unknown option: -${ch}` };
      }
    } else {
      return { options: opts, help: false, error: `unknown option: ${a}` };
    }
    i++;
  }
  return { options: opts, help: false };
}

export function helpText(): string {
  return HELP;
}

export async function hashStream(stream: NodeJS.ReadableStream): Promise<string> {
  const md = new Md5();
  for await (const chunk of stream) {
    md.update(chunk as Buffer);
  }
  return md.hex();
}

export async function hashFile(path: string): Promise<string> {
  if (path === "-") return hashStream(process.stdin);
  // Use a stream so large files don't need to fit in memory.
  const stream = createReadStream(path);
  return hashStream(stream);
}

export function formatLine(hash: string, file: string, binary: boolean): string {
  return `${hash} ${binary ? "*" : " "}${file}`;
}

export interface ChecksumLine {
  hash: string;
  binary: boolean;
  file: string;
}

// Parse one line from a checksums file. Returns null if it isn't a valid line.
export function parseChecksumLine(line: string): ChecksumLine | null {
  // Strip a single trailing \r so CRLF files still parse.
  const l = line.endsWith("\r") ? line.slice(0, -1) : line;
  // Format: <32 hex chars><space><space-or-asterisk><filename>
  if (l.length < 34) return null;
  const hash = l.slice(0, 32);
  if (!/^[0-9a-fA-F]{32}$/.test(hash)) return null;
  if (l[32] !== " ") return null;
  const marker = l[33];
  if (marker !== " " && marker !== "*") return null;
  const file = l.slice(34);
  if (file.length === 0) return null;
  return { hash: hash.toLowerCase(), binary: marker === "*", file };
}

export interface CheckSummary {
  total: number;
  failed: number;
  missing: number;
  malformed: number;
}

export interface CheckOutput {
  lines: string[];
  warnings: string[];
  summary: CheckSummary;
}

export async function runCheck(
  checkFile: string,
  opts: Pick<Options, "quiet" | "status" | "warn">,
  read: (p: string) => Promise<string> = readTextFile,
  hash: (p: string) => Promise<string> = hashFile,
): Promise<CheckOutput> {
  const text = await read(checkFile);
  const out: CheckOutput = {
    lines: [],
    warnings: [],
    summary: { total: 0, failed: 0, missing: 0, malformed: 0 },
  };
  const rawLines = text.split("\n");
  // Drop a trailing empty produced by a final newline.
  if (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") rawLines.pop();

  let lineNo = 0;
  for (const raw of rawLines) {
    lineNo++;
    if (raw === "") continue;
    const parsed = parseChecksumLine(raw);
    if (!parsed) {
      out.summary.malformed++;
      if (opts.warn) {
        out.warnings.push(
          `md5sum: ${checkFile}: ${lineNo}: improperly formatted MD5 checksum line`,
        );
      }
      continue;
    }
    out.summary.total++;
    let actual: string;
    try {
      actual = await hash(parsed.file);
    } catch {
      out.summary.missing++;
      out.summary.failed++;
      if (!opts.status) {
        out.lines.push(`${parsed.file}: FAILED open or read`);
      }
      if (!opts.status) {
        out.warnings.push(`md5sum: ${parsed.file}: No such file or directory`);
      }
      continue;
    }
    if (actual === parsed.hash) {
      if (!opts.quiet && !opts.status) {
        out.lines.push(`${parsed.file}: OK`);
      }
    } else {
      out.summary.failed++;
      if (!opts.status) {
        out.lines.push(`${parsed.file}: FAILED`);
      }
    }
  }

  if (out.summary.total === 0 && out.summary.malformed > 0 && !opts.status) {
    out.warnings.push(
      `md5sum: ${checkFile}: no properly formatted MD5 checksum lines found`,
    );
  }
  if (out.summary.malformed > 0 && out.summary.total > 0 && !opts.status) {
    out.warnings.push(
      `md5sum: WARNING: ${out.summary.malformed} line${out.summary.malformed === 1 ? "" : "s"} is improperly formatted`,
    );
  }
  if (out.summary.missing > 0 && !opts.status) {
    out.warnings.push(
      `md5sum: WARNING: ${out.summary.missing} listed file${out.summary.missing === 1 ? "" : "s"} could not be read`,
    );
  }
  const mismatched = out.summary.failed - out.summary.missing;
  if (mismatched > 0 && !opts.status) {
    out.warnings.push(
      `md5sum: WARNING: ${mismatched} computed checksum${mismatched === 1 ? "" : "s"} did NOT match`,
    );
  }

  return out;
}

async function readTextFile(path: string): Promise<string> {
  const fh = await open(path, "r");
  try {
    const buf = await fh.readFile();
    return buf.toString("utf8");
  } finally {
    await fh.close();
  }
}

export interface RunResult {
  stdout: string[];
  stderr: string[];
  exitCode: number;
}

export async function run(argv: readonly string[]): Promise<RunResult> {
  const parsed = parseArgs(argv);
  const result: RunResult = { stdout: [], stderr: [], exitCode: 0 };

  if (parsed.help) {
    result.stdout.push(helpText());
    return result;
  }
  if (parsed.error) {
    result.stderr.push(`md5sum: ${parsed.error}`);
    result.stderr.push(`Try 'md5sum --help' for more information.`);
    result.exitCode = 1;
    return result;
  }

  const { options } = parsed;
  const files = options.files.length === 0 ? ["-"] : options.files;

  if (options.check) {
    let any = false;
    for (const cf of files) {
      try {
        const co = await runCheck(cf, options);
        any = any || co.summary.total > 0;
        for (const l of co.lines) result.stdout.push(l);
        for (const w of co.warnings) result.stderr.push(w);
        if (co.summary.failed > 0) result.exitCode = 1;
        if (options.strict && co.summary.malformed > 0) result.exitCode = 1;
        if (co.summary.total === 0 && co.summary.malformed > 0) result.exitCode = 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        result.stderr.push(`md5sum: ${cf}: ${msg}`);
        result.exitCode = 1;
      }
    }
    return result;
  }

  for (const f of files) {
    try {
      const h = await hashFile(f);
      const name = f === "-" ? "-" : f;
      result.stdout.push(formatLine(h, name, options.binary));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result.stderr.push(`md5sum: ${f}: ${msg}`);
      result.exitCode = 1;
    }
  }
  return result;
}
