import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Create the challenge's sample directory structure rooted at `root`
 * (i.e. pass `.../testdir`). Every file is small (< 512 bytes), so each
 * occupies exactly one 512-byte block.
 */
export async function createTestdir(root: string): Promise<void> {
  await mkdir(join(root, "subdir1", "deep"), { recursive: true });
  await mkdir(join(root, "subdir2"), { recursive: true });
  await writeFile(join(root, "file1.txt"), "hello world\n");
  await writeFile(
    join(root, "subdir1", "file2.txt"),
    "this is a slightly longer file with more content in it\n",
  );
  await writeFile(join(root, "subdir1", "deep", "file3.txt"), "deep file\n");
  await writeFile(join(root, "subdir2", "file4.txt"), "another file\n");
}
