import { Buffer } from 'node:buffer';

export function byteLength(text: string): number {
  // TODO: count UTF-8 bytes, not characters
  return text.length;
}

export function encodeBasicAuth(user: string, password: string): string {
  // TODO: 'Basic ' + base64 of "user:password"
  return '';
}

export function decodeBasicAuth(header: string): { user: string; password: string } | null {
  // TODO: check the scheme, decode base64 and split on the first ':'
  return null;
}

export function truncateBytes(text: string, maxBytes: number): string {
  // TODO: keep whole characters while the total stays within maxBytes
  return text.slice(0, maxBytes);
}

export function decodeChunks(chunks: Buffer[]): string {
  // TODO: join the bytes before decoding
  return chunks.map((chunk) => chunk.toString('utf8')).join('');
}

function main() {
  console.log(byteLength('héllo'), byteLength('👋'));
  const header = encodeBasicAuth('ada', 'pa:ss');
  console.log(header, decodeBasicAuth(header));
  console.log(truncateBytes('naïve café', 7));
  const euro = Buffer.from('€ 5');
  console.log(decodeChunks([euro.subarray(0, 2), euro.subarray(2)]));
}

main();
