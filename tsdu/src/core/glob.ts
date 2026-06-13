/** A minimal glob matcher for `--exclude` patterns (no external dependency). */

/** Translate a shell-style glob into an anchored regular expression. */
function globToRegExp(pattern: string): RegExp {
  let out = "^";
  for (const ch of pattern) {
    switch (ch) {
      case "*":
        out += "[^/]*";
        break;
      case "?":
        out += "[^/]";
        break;
      // Escape regex metacharacters that may appear in filenames.
      case ".":
      case "+":
      case "(":
      case ")":
      case "|":
      case "[":
      case "]":
      case "{":
      case "}":
      case "^":
      case "$":
      case "\\":
        out += `\\${ch}`;
        break;
      default:
        out += ch;
    }
  }
  out += "$";
  return new RegExp(out);
}

/** A compiled set of exclude patterns. */
export class ExcludeMatcher {
  private readonly regexes: RegExp[];

  constructor(patterns: string[] = []) {
    this.regexes = patterns.map(globToRegExp);
  }

  /** Whether any pattern was supplied. */
  get isEmpty(): boolean {
    return this.regexes.length === 0;
  }

  /** Whether the given entry name matches any exclude pattern. */
  matches(name: string): boolean {
    return this.regexes.some((re) => re.test(name));
  }
}
