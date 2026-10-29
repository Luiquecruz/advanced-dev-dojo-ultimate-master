import { createHmac, timingSafeEqual } from 'node:crypto';

export type JwtPayload = Record<string, unknown>;

export class JwtError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JwtError';
  }
}

export function base64UrlEncode(input: string | Buffer): string {
  const buffer = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(input: string): Buffer {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='), 'base64');
}

function signature(data: string, secret: string): string {
  return base64UrlEncode(createHmac('sha256', secret).update(data).digest());
}

function parseJson(part: string): JwtPayload {
  try {
    const value = JSON.parse(base64UrlDecode(part).toString('utf8'));
    if (typeof value !== 'object' || value === null) {
      throw new Error('Not an object');
    }
    return value;
  } catch {
    throw new JwtError('Malformed token');
  }
}

export function sign(payload: JwtPayload, secret: string, options: { expiresInSeconds?: number; now?: () => number } = {}): string {
  const issuedAt = Math.floor((options.now ?? Date.now)() / 1000);
  const claims: JwtPayload = { ...payload, iat: issuedAt };
  if (options.expiresInSeconds !== undefined) {
    claims.exp = issuedAt + options.expiresInSeconds;
  }
  const data = `${base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${base64UrlEncode(JSON.stringify(claims))}`;
  return `${data}.${signature(data, secret)}`;
}

export function verify(token: string, secret: string, options: { now?: () => number } = {}): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new JwtError('Malformed token');
  }
  const [header, payload, received] = parts;
  if (parseJson(header).alg !== 'HS256') {
    throw new JwtError('Unsupported algorithm');
  }
  const expected = Buffer.from(signature(`${header}.${payload}`, secret));
  const actual = Buffer.from(received);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new JwtError('Invalid signature');
  }
  const claims = parseJson(payload);
  const nowSeconds = Math.floor((options.now ?? Date.now)() / 1000);
  if (typeof claims.exp === 'number' && nowSeconds >= claims.exp) {
    throw new JwtError('Token expired');
  }
  return claims;
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
