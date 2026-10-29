import { Buffer } from 'node:buffer';

export function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

export function encodeBasicAuth(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`;
}

export function decodeBasicAuth(header: string): { user: string; password: string } | null {
  const match = /^basic (.+)$/i.exec(header);
  if (!match) {
    return null;
  }
  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  const separator = decoded.indexOf(':');
  if (separator === -1) {
    return null;
  }
  return { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
}

export function truncateBytes(text: string, maxBytes: number): string {
  let result = '';
  let used = 0;
  for (const char of text) {
    const size = Buffer.byteLength(char, 'utf8');
    if (used + size > maxBytes) {
      break;
    }
    result += char;
    used += size;
  }
  return result;
}

export function decodeChunks(chunks: Buffer[]): string {
  return Buffer.concat(chunks).toString('utf8');
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
