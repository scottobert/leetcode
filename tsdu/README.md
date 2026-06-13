# tsdu — Build Your Own `du`

A TypeScript implementation of the POSIX `du` (disk usage) utility, built for
[Coding Challenges #124](https://codingchallenges.substack.com/p/coding-challenge-124-du).
The command is called `ccdu`.

It recursively walks directory trees, sums disk usage, de-duplicates hard links,
optionally follows symbolic links, and prints the results in a variety of
formats — compatible with the way the system `du` is used.

## Design

The project is split into a **UI-agnostic core engine** and a **thin CLI** so the
same engine can later be wrapped in a GUI without any rework:

```
src/
  core/            ← the engine (no I/O beyond the filesystem, no CLI concerns)
    types.ts       ← shared data types (FsNode tree, DuEntry, options)
    size.ts        ← block/byte math, unit formatting, size parsing
    glob.ts        ← --exclude glob matching
    walk.ts        ← filesystem traversal → FsNode trees (inode/symlink aware)
    select.ts      ← flatten trees → ordered, filtered output rows
    format.ts      ← render rows → text lines
    du.ts          ← du(paths, options) orchestrates the above → DuResult
    index.ts       ← public core API
  cli/             ← the command-line front end
    args.ts        ← argv → options parser
    main.ts        ← run(argv, io) → exit code; the ccdu entry point
```

### Why this is GUI-ready

`du()` returns a structured [`DuResult`](src/core/types.ts):

- `roots` — the fully-computed `FsNode` tree(s), ideal for a tree/treemap view;
- `entries` — the flattened, filtered rows;
- `lines` — ready-to-print text (what the CLI emits).

A GUI can call `du()` and render `roots` directly, or drive the individual
stages (`walkPaths` → `selectEntries` → `formatEntries`) itself. The core never
reads `argv`, writes to stdout, or calls `process.exit`, so it is fully reusable
and testable. `run()` in the CLI takes injectable `stdout`/`stderr` sinks for the
same reason.

## Usage

```bash
npm install      # install dev dependencies
npm run build    # compile to dist/
node dist/cli/main.js testdir
# or, equivalently:
npm run ccdu -- testdir
```

### Options

| Flag | Long form | Meaning |
| --- | --- | --- |
| `-a` | | Show an entry for every file, not just directories |
| `-s` | `--summarize` | Show only a total per argument |
| `-c` | `--total` | Print a grand-total line |
| `-h` | `--human-readable` | Human-readable sizes (e.g. `1.2M`) |
| `-k` | | Sizes in 1024-byte kilobytes |
| `-m` | | Sizes in megabytes |
| `-L` | `--dereference` | Follow symbolic links |
| `-d N` | `--max-depth=N` | Limit output to `N` levels deep (`-d 0` ≈ `-s`) |
| `-t SIZE` | `--threshold=SIZE` | Only show entries of `SIZE` bytes or more (e.g. `1K`, `10M`) |
| | `--exclude=PATTERN` | Skip files/dirs whose name matches the glob (repeatable) |
| | `--help` / `--version` | |

Sizes default to **512-byte blocks** (the POSIX default). Exit codes follow `du`:
`0` success, `1` if some paths could not be read, `2` on a usage error.

## Implementation notes

- **Block model.** Per the challenge, a file's usage is its byte size rounded up
  to whole 512-byte blocks; empty files are 0 blocks. Directories contribute the
  sum of the files beneath them. (Real filesystems also allocate blocks for the
  directory inodes themselves, so the absolute numbers differ from the system
  `du` — the structure and ordering match.)
- **Output order.** Post-order traversal: children before parents, deepest
  first, each argument's total last. Directory entries are sorted by name for
  deterministic output.
- **Hard links.** Inodes are tracked so a hard-linked file is counted once; only
  the first link encountered is shown. De-duplication is reset per path
  argument, so overlapping arguments each report their full size.
- **Symlinks.** Off by default (the link itself is counted). With `-L`, links are
  followed and an ancestor-stack guard prevents infinite loops on cyclic links.

## Tests

```bash
npm test
```

Vitest covers each stage in isolation (`size`, `glob`, `select`, `args`) and the
full pipeline against real temporary directories (`du`, `cli`), exercising every
step of the challenge (Steps 1–10).
