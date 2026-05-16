import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { md5Hex, Md5 } from "../src/md5";

// RFC 1321 test vectors plus a few extras.
const vectors: Array<[string, string]> = [
  ["", "d41d8cd98f00b204e9800998ecf8427e"],
  ["a", "0cc175b9c0f1b6a831c399e269772661"],
  ["abc", "900150983cd24fb0d6963f7d28e17f72"],
  ["message digest", "f96b697d7cb7938d525a2f31aaf161d0"],
  ["abcdefghijklmnopqrstuvwxyz", "c3fcd3d76192e4007dfb496cca67e13b"],
  [
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
    "d174ab98d277d9f5a5611c2c9f419d9f",
  ],
  [
    "12345678901234567890123456789012345678901234567890123456789012345678901234567890",
    "57edf4a22be3c955ac49da2e2107b67a",
  ],
];

describe("md5", () => {
  for (const [input, expected] of vectors) {
    it(`hashes ${JSON.stringify(input.length > 20 ? input.slice(0, 20) + "..." : input)}`, () => {
      assert.equal(md5Hex(input), expected);
    });
  }

  it("matches when fed in many small chunks (streaming)", () => {
    const input = "The quick brown fox jumps over the lazy dog";
    const expected = "9e107d9d372bb6826bd81d3542a419d6";
    const md = new Md5();
    for (const c of input) md.update(c);
    assert.equal(md.hex(), expected);
    assert.equal(md5Hex(input), expected);
  });

  it("handles message exactly 55 bytes (padding edge: no extra block)", () => {
    const s = "a".repeat(55);
    // Cross-checked against system md5sum:
    //   $ printf '%.0sa' {1..55} | md5sum
    assert.equal(md5Hex(s), "ef1772b6dff9a122358552954ad0df65");
  });

  it("handles message exactly 56 bytes (padding edge: extra block needed)", () => {
    const s = "a".repeat(56);
    assert.equal(md5Hex(s), "3b0c8ac703f828b04c6c197006d17218");
  });

  it("handles message exactly 64 bytes (full block)", () => {
    const s = "a".repeat(64);
    assert.equal(md5Hex(s), "014842d480b571495a4a0363793f7367");
  });

  it("handles a large message (1MB of 'a')", () => {
    const s = "a".repeat(1024 * 1024);
    assert.equal(md5Hex(s), "7202826a7791073fe2787f0c94603278");
  });

  it("hashes binary data with null bytes", () => {
    const buf = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0x00]);
    assert.equal(md5Hex(buf), "744190d34d085916ee22990db1243b42");
  });
});
