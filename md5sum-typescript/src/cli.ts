#!/usr/bin/env node
import { run } from "./md5sum";

async function main(): Promise<void> {
  const result = await run(process.argv.slice(2));
  for (const l of result.stdout) process.stdout.write(l + "\n");
  for (const l of result.stderr) process.stderr.write(l + "\n");
  process.exit(result.exitCode);
}

void main();
