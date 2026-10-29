import BufferModule from 'buffer/index.js';
import { setTimeout } from './timers';

const { Buffer } = BufferModule;

type Input = string | Uint8Array;
type Digest = (data: Uint8Array) => Uint8Array;
type OutputEncoding = 'hex' | 'base64' | 'base64url' | 'latin1' | 'binary';

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function pad(data: Uint8Array): DataView {
  const length = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(length);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(length - 8, Math.floor((data.length * 8) / 2 ** 32));
  view.setUint32(length - 4, (data.length * 8) >>> 0);
  return view;
}

const rotate = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits));

function sha256(data: Uint8Array): Uint8Array {
  const view = pad(data);
  const hash = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const words = new Uint32Array(64);
  for (let block = 0; block < view.byteLength; block += 64) {
    for (let index = 0; index < 16; index++) {
      words[index] = view.getUint32(block + index * 4);
    }
    for (let index = 16; index < 64; index++) {
      const s0 = rotate(words[index - 15], 7) ^ rotate(words[index - 15], 18) ^ (words[index - 15] >>> 3);
      const s1 = rotate(words[index - 2], 17) ^ rotate(words[index - 2], 19) ^ (words[index - 2] >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index++) {
      const t1 = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + SHA256_K[index] + words[index]) >>> 0;
      const t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      [h, g, f, e, d, c, b, a] = [g, f, e, (d + t1) >>> 0, c, b, a, (t1 + t2) >>> 0];
    }
    [a, b, c, d, e, f, g, h].forEach((value, index) => (hash[index] = (hash[index] + value) >>> 0));
  }
  const output = new DataView(new ArrayBuffer(32));
  hash.forEach((value, index) => output.setUint32(index * 4, value));
  return new Uint8Array(output.buffer);
}

function sha1(data: Uint8Array): Uint8Array {
  const view = pad(data);
  const hash = new Uint32Array([0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0]);
  const words = new Uint32Array(80);
  for (let block = 0; block < view.byteLength; block += 64) {
    for (let index = 0; index < 16; index++) {
      words[index] = view.getUint32(block + index * 4);
    }
    for (let index = 16; index < 80; index++) {
      words[index] = rotate(words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16], 31);
    }
    let [a, b, c, d, e] = hash;
    for (let index = 0; index < 80; index++) {
      const [f, k] =
        index < 20 ? [(b & c) | (~b & d), 0x5a827999] : index < 40 ? [b ^ c ^ d, 0x6ed9eba1] : index < 60 ? [(b & c) | (b & d) | (c & d), 0x8f1bbcdc] : [b ^ c ^ d, 0xca62c1d6];
      const next = (rotate(a, 27) + f + e + k + words[index]) >>> 0;
      [e, d, c, b, a] = [d, c, rotate(b, 2), a, next];
    }
    [a, b, c, d, e].forEach((value, index) => (hash[index] = (hash[index] + value) >>> 0));
  }
  const output = new DataView(new ArrayBuffer(20));
  hash.forEach((value, index) => output.setUint32(index * 4, value));
  return new Uint8Array(output.buffer);
}

const ALGORITHMS: Record<string, Digest> = { sha256, sha1 };

function digestFor(algorithm: string): Digest {
  const digest = ALGORITHMS[algorithm.toLowerCase().replace('-', '')];
  if (!digest) {
    throw new Error(`Digest method not supported here: "${algorithm}". Available: sha256, sha1.`);
  }
  return digest;
}

function toBytes(input: Input, encoding?: BufferEncoding): Uint8Array {
  return typeof input === 'string' ? Buffer.from(input, encoding ?? 'utf8') : input;
}

function encode(bytes: Uint8Array, encoding?: OutputEncoding): any {
  const buffer = Buffer.from(bytes);
  if (encoding === 'base64url') {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return encoding ? buffer.toString(encoding) : buffer;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

function hmac(digest: Digest, key: Uint8Array, data: Uint8Array): Uint8Array {
  const blockKey = new Uint8Array(64);
  blockKey.set(key.length > 64 ? digest(key) : key);
  const inner = blockKey.map((byte) => byte ^ 0x36);
  const outer = blockKey.map((byte) => byte ^ 0x5c);
  return digest(concat([outer, digest(concat([inner, data]))]));
}

class Hash {
  private parts: Uint8Array[] = [];
  private finished = false;

  constructor(private readonly compute: (data: Uint8Array) => Uint8Array) {}

  update(data: Input, encoding?: BufferEncoding): this {
    if (this.finished) {
      throw new Error('Digest already called');
    }
    this.parts.push(toBytes(data, encoding));
    return this;
  }

  digest(encoding?: OutputEncoding): any {
    this.finished = true;
    return encode(this.compute(concat(this.parts)), encoding);
  }
}

export function createHash(algorithm: string): Hash {
  const digest = digestFor(algorithm);
  return new Hash(digest);
}

export function createHmac(algorithm: string, key: Input): Hash {
  const digest = digestFor(algorithm);
  const keyBytes = toBytes(key);
  return new Hash((data) => hmac(digest, keyBytes, data));
}

export function hash(algorithm: string, data: Input, encoding: OutputEncoding = 'hex'): any {
  return createHash(algorithm).update(data).digest(encoding);
}

export function getHashes(): string[] {
  return Object.keys(ALGORITHMS);
}

export function pbkdf2Sync(password: Input, salt: Input, iterations: number, keyLength: number, algorithm: string): any {
  const digest = digestFor(algorithm);
  const passwordBytes = toBytes(password);
  const saltBytes = toBytes(salt);
  const blocks: Uint8Array[] = [];
  const blockLength = digest(new Uint8Array()).length;
  for (let block = 1; blocks.length * blockLength < keyLength; block++) {
    const counter = new Uint8Array([block >>> 24, (block >>> 16) & 0xff, (block >>> 8) & 0xff, block & 0xff]);
    let previous = hmac(digest, passwordBytes, concat([saltBytes, counter]));
    const result = previous.slice();
    for (let round = 1; round < iterations; round++) {
      previous = hmac(digest, passwordBytes, previous);
      result.forEach((byte, index) => (result[index] = byte ^ previous[index]));
    }
    blocks.push(result);
  }
  return Buffer.from(concat(blocks).slice(0, keyLength));
}

export function pbkdf2(password: Input, salt: Input, iterations: number, keyLength: number, algorithm: string, callback: (error: Error | null, key?: Buffer) => void): void {
  setTimeout(() => {
    try {
      callback(null, pbkdf2Sync(password, salt, iterations, keyLength, algorithm));
    } catch (error) {
      callback(error as Error);
    }
  }, 0);
}

export function randomBytes(size: number): any {
  return Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(size)));
}

export function randomUUID(): string {
  return globalThis.crypto.randomUUID();
}

export function randomInt(minimum: number, maximum?: number): number {
  const [low, high] = maximum === undefined ? [0, minimum] : [minimum, maximum];
  return low + Math.floor((globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * (high - low));
}

export function timingSafeEqual(first: Uint8Array, second: Uint8Array): boolean {
  if (first.length !== second.length) {
    throw new RangeError('Input buffers must have the same byte length');
  }
  let difference = 0;
  first.forEach((byte, index) => (difference |= byte ^ second[index]));
  return difference === 0;
}

export const webcrypto = globalThis.crypto;
export const subtle = globalThis.crypto.subtle;
export const getRandomValues = <T extends ArrayBufferView>(array: T): T => globalThis.crypto.getRandomValues(array as any) as T;
