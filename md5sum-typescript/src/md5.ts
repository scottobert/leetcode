// MD5 (RFC 1321) implemented from scratch.
// Operates on 32-bit unsigned words and produces a 128-bit digest.

const S: readonly number[] = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];

const K: readonly number[] = (() => {
  const out: number[] = [];
  for (let i = 0; i < 64; i++) {
    out.push(Math.floor(Math.abs(Math.sin(i + 1)) * 0x1_0000_0000) >>> 0);
  }
  return out;
})();

function rotl(x: number, n: number): number {
  return ((x << n) | (x >>> (32 - n))) >>> 0;
}

function add32(...xs: number[]): number {
  let s = 0;
  for (const x of xs) s = (s + x) >>> 0;
  return s;
}

export class Md5 {
  private a = 0x67452301;
  private b = 0xefcdab89;
  private c = 0x98badcfe;
  private d = 0x10325476;
  private totalLen = 0; // total bytes hashed
  private buffer = Buffer.alloc(64);
  private bufferLen = 0;

  update(chunk: Buffer | Uint8Array | string): this {
    const data = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : Buffer.from(chunk);
    this.totalLen += data.length;
    let offset = 0;

    if (this.bufferLen > 0) {
      const need = 64 - this.bufferLen;
      const take = Math.min(need, data.length);
      data.copy(this.buffer, this.bufferLen, 0, take);
      this.bufferLen += take;
      offset += take;
      if (this.bufferLen === 64) {
        this.processBlock(this.buffer, 0);
        this.bufferLen = 0;
      }
    }

    while (data.length - offset >= 64) {
      this.processBlock(data, offset);
      offset += 64;
    }

    if (offset < data.length) {
      data.copy(this.buffer, 0, offset);
      this.bufferLen = data.length - offset;
    }

    return this;
  }

  digest(): Buffer {
    // Padding: append 0x80, then zeros, then 64-bit little-endian length-in-bits.
    const tail = Buffer.alloc(this.bufferLen < 56 ? 64 : 128);
    this.buffer.copy(tail, 0, 0, this.bufferLen);
    tail[this.bufferLen] = 0x80;

    // Bit length, little-endian, 64 bits. JS bit ops are 32-bit, so split.
    const bits = this.totalLen * 8;
    const low = bits >>> 0;
    const high = Math.floor(bits / 0x1_0000_0000) >>> 0;
    tail.writeUInt32LE(low, tail.length - 8);
    tail.writeUInt32LE(high, tail.length - 4);

    for (let off = 0; off < tail.length; off += 64) {
      this.processBlock(tail, off);
    }

    const out = Buffer.alloc(16);
    out.writeUInt32LE(this.a, 0);
    out.writeUInt32LE(this.b, 4);
    out.writeUInt32LE(this.c, 8);
    out.writeUInt32LE(this.d, 12);
    return out;
  }

  hex(): string {
    return this.digest().toString("hex");
  }

  private processBlock(block: Buffer, offset: number): void {
    const M = new Array<number>(16);
    for (let i = 0; i < 16; i++) {
      M[i] = block.readUInt32LE(offset + i * 4);
    }

    let a = this.a;
    let b = this.b;
    let c = this.c;
    let d = this.d;

    for (let i = 0; i < 64; i++) {
      let f: number;
      let g: number;
      if (i < 16) {
        f = (b & c) | (~b & d);
        g = i;
      } else if (i < 32) {
        f = (d & b) | (~d & c);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        f = b ^ c ^ d;
        g = (3 * i + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * i) % 16;
      }
      f = f >>> 0;
      const temp = d;
      d = c;
      c = b;
      b = add32(b, rotl(add32(a, f, K[i], M[g]), S[i]));
      a = temp;
    }

    this.a = add32(this.a, a);
    this.b = add32(this.b, b);
    this.c = add32(this.c, c);
    this.d = add32(this.d, d);
  }
}

export function md5Hex(data: Buffer | Uint8Array | string): string {
  return new Md5().update(data).hex();
}
