import { pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

export const ITERATIONS = 1000;
export const KEY_LENGTH = 32;
export const SALT_BYTES = 16;
const ALGORITHM = 'pbkdf2_sha256';

const derive = promisify(pbkdf2);

interface ParsedHash {
  iterations: number;
  salt: Buffer;
  hash: Buffer;
}

function parse(stored: string): ParsedHash | null {
  const [algorithm, iterations, salt, hash, ...rest] = stored.split('$');
  if (algorithm !== ALGORITHM || rest.length > 0 || !salt || !hash || !/^[1-9]\d*$/.test(iterations ?? '')) {
    return null;
  }
  return { iterations: Number(iterations), salt: Buffer.from(salt, 'base64'), hash: Buffer.from(hash, 'base64') };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await derive(password, salt, ITERATIONS, KEY_LENGTH, 'sha256');
  return `${ALGORITHM}$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parse(stored);
  if (!parsed || parsed.hash.length === 0) {
    return false;
  }
  const candidate = await derive(password, parsed.salt, parsed.iterations, parsed.hash.length, 'sha256');
  return timingSafeEqual(candidate, parsed.hash);
}

export function needsRehash(stored: string): boolean {
  const parsed = parse(stored);
  return !parsed || parsed.iterations < ITERATIONS;
}

export async function login(users: Map<string, string>, email: string, password: string): Promise<boolean> {
  const stored = users.get(email);
  if (!stored || !(await verifyPassword(password, stored))) {
    return false;
  }
  if (needsRehash(stored)) {
    users.set(email, await hashPassword(password));
  }
  return true;
}

async function main() {
  const stored = await hashPassword('correct horse battery staple');
  console.log(stored);
  console.log('right password:', await verifyPassword('correct horse battery staple', stored));
  console.log('wrong password:', await verifyPassword('hunter2', stored));
}

main();
