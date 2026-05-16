# md5sum-typescript

A TypeScript implementation of the Unix `md5sum` utility, written for [Coding
Challenges #120](https://codingchallenges.substack.com/p/coding-challenge-120-md5sum).

The MD5 algorithm itself is implemented from scratch following
[RFC 1321](https://www.rfc-editor.org/rfc/rfc1321) — no `node:crypto`, no
third-party hash library.

## Layout

```
src/
  md5.ts        # streaming MD5 implementation
  md5sum.ts     # argv parsing, file I/O, check mode
  cli.ts        # thin entry point
test/
  md5.test.ts
  md5sum.test.ts
```

## Install & build

```sh
npm install
npm run build
```

Or run directly with `ts-node`:

```sh
npm start -- README.md
# or
npx ts-node src/cli.ts README.md
```

## Usage

```
md5sum-ts [OPTION]... [FILE]...

  -b, --binary      read in binary mode (prefixes filename with '*')
  -c, --check       verify checksums listed in FILE
  -t, --text        read in text mode (default)
      --quiet       don't print OK lines while checking
      --status      don't print anything; rely on exit code
      --strict      exit non-zero on malformed checksum lines
  -w, --warn        warn about malformed checksum lines
      --help        show this help
```

With no FILE, or when FILE is `-`, it reads from standard input.

## Walkthrough of the challenge steps

### Step 1 — hash one or more files

```sh
$ md5sum-ts README.md src/md5.ts
e2c2...c3  README.md
4b9a...11  src/md5.ts
```

Output is `<32-hex>  <filename>` (two spaces), matching GNU `md5sum`. A missing
file produces an error on stderr and a non-zero exit code; other files still
get hashed.

### Step 2 — binary mode

```sh
$ md5sum-ts -b /bin/ls
93f2...0d *bin/ls
```

The space before the filename becomes `*`, exactly as the system `md5sum`
prints it. Compare against your OS's `md5sum -b /bin/ls` to verify.

### Steps 3 & 4 — check mode

```sh
$ md5sum-ts README.md src/md5.ts > sums.md5
$ md5sum-ts -c sums.md5
README.md: OK
src/md5.ts: OK
```

If any computed checksum disagrees with the file, that line prints `FAILED`
and the process exits non-zero. Missing files are reported as
`FAILED open or read`. The verifier accepts both text-mode (`  `) and
binary-mode (` *`) lines and ignores trailing `\r` so CRLF checksum files
work.

`--quiet`, `--status`, `--warn`, and `--strict` behave the same as in GNU
`md5sum`.

## Tests

```sh
npm test
```

Covers:

- The RFC 1321 test vectors.
- The 55/56/64-byte padding boundary cases (where the algorithm has to add an
  extra block).
- Streaming the same input one character at a time vs. as a single buffer.
- A 1 MiB input verified against `crypto.createHash('md5')`.
- Argv parsing, including `--`, grouped short flags, and `-` as a filename.
- End-to-end: hashing real files, binary mode, missing files, check mode (OK,
  FAILED, missing, malformed, `--quiet`, `--status`).
