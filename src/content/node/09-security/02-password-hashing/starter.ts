import { createHash, pbkdf2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

export const ITERATIONS = 1000;
export const KEY_LENGTH = 32;
export const SALT_BYTES = 16;

export async function hashPassword(password: string): Promise<string> {
  // TODO: derive a key with pbkdf2 (random 16-byte salt, ITERATIONS, KEY_LENGTH, sha256) and return pbkdf2_sha256$<iterations>$<salt>$<hash>
  return createHash('sha256').update(password).digest('hex');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // TODO: parse the stored value (false when malformed), derive again with its salt and iterations, compare with timingSafeEqual
  return (await hashPassword(password)) === stored;
}

export function needsRehash(stored: string): boolean {
  // TODO: true when the value is not pbkdf2_sha256 or uses fewer than ITERATIONS
  return false;
}

export async function login(users: Map<string, string>, email: string, password: string): Promise<boolean> {
  // TODO: verify against the stored hash and upgrade it with hashPassword when needsRehash says so
  const stored = users.get(email);
  return stored !== undefined && verifyPassword(password, stored);
}

async function main() {
  const stored = await hashPassword('correct horse battery staple');
  console.log(stored);
  console.log('right password:', await verifyPassword('correct horse battery staple', stored));
  console.log('wrong password:', await verifyPassword('hunter2', stored));
}

main();
