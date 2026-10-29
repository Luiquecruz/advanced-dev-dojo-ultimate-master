// TODO: import randomUUID from the built-in crypto module using the node: prefix
import { randomUUID } from 'crypto';

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function isId(value: string, prefix: string): boolean {
  return new RegExp(`^${prefix}_[0-9a-f-]{36}$`).test(value);
}
