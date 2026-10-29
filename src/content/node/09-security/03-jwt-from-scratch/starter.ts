import { createHmac, timingSafeEqual } from 'node:crypto';

export type JwtPayload = Record<string, unknown>;

export class JwtError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JwtError';
  }
}

export function base64UrlEncode(input: string | Buffer): string {
  // TODO: convert base64 to base64url: + becomes -, / becomes _, and drop the trailing = padding
  const buffer = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buffer.toString('base64');
}

export function base64UrlDecode(input: string): Buffer {
  // TODO: convert base64url back to base64 (restore + and / and the padding) before decoding
  return Buffer.from(input, 'base64');
}

export function sign(payload: JwtPayload, secret: string, options: { expiresInSeconds?: number; now?: () => number } = {}): string {
  // TODO: add iat (and exp when expiresInSeconds is set), encode header and payload, append the HMAC-SHA256 signature
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  return `${header}.${base64UrlEncode(JSON.stringify(payload))}.`;
}

export function verify(token: string, secret: string, options: { now?: () => number } = {}): JwtPayload {
  // TODO: check the shape, the algorithm, the signature (timingSafeEqual) and the expiry before trusting the payload
  return JSON.parse(base64UrlDecode(token.split('.')[1]).toString('utf8'));
}

function main() {
  const secret = 'a-long-random-secret-from-the-environment';
  const token = sign({ sub: '42', role: 'admin' }, secret, { expiresInSeconds: 900 });
  console.log(token);
  console.log(verify(token, secret));
  try {
    verify(token, 'another-secret');
  } catch (error) {
    console.log((error as Error).message);
  }
}

main();
