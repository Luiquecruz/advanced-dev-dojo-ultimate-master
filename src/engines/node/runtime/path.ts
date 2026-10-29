import { process } from './process';

export const sep = '/';
export const delimiter = ':';

export function isAbsolute(path: string): boolean {
  return path.startsWith('/');
}

export function normalize(path: string): string {
  if (path === '') {
    return '.';
  }
  const absolute = isAbsolute(path);
  const trailing = path.endsWith('/');
  const segments: string[] = [];
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') {
      continue;
    }
    if (segment === '..') {
      if (segments.length > 0 && segments[segments.length - 1] !== '..') {
        segments.pop();
      } else if (!absolute) {
        segments.push('..');
      }
      continue;
    }
    segments.push(segment);
  }
  const joined = segments.join('/');
  if (absolute) {
    return `/${joined}${trailing && joined ? '/' : ''}`;
  }
  return joined ? `${joined}${trailing ? '/' : ''}` : trailing ? './' : '.';
}

export function join(...paths: string[]): string {
  const joined = paths.filter((path) => path !== '').join('/');
  return joined ? normalize(joined) : '.';
}

export function resolve(...paths: string[]): string {
  let resolved = '';
  for (let index = paths.length - 1; index >= -1 && !isAbsolute(resolved); index--) {
    const path = index >= 0 ? paths[index] : process.cwd();
    if (path) {
      resolved = resolved ? `${path}/${resolved}` : path;
    }
  }
  const normalized = normalize(resolved);
  return normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

export function dirname(path: string): string {
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const index = trimmed.lastIndexOf('/');
  if (index === -1) {
    return '.';
  }
  return index === 0 ? '/' : trimmed.slice(0, index);
}

export function basename(path: string, suffix?: string): string {
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const base = trimmed.slice(trimmed.lastIndexOf('/') + 1);
  return suffix && base.endsWith(suffix) && base !== suffix ? base.slice(0, -suffix.length) : base;
}

export function extname(path: string): string {
  const base = basename(path);
  const index = base.lastIndexOf('.');
  return index <= 0 ? '' : base.slice(index);
}

export function relative(from: string, to: string): string {
  const fromSegments = resolve(from).split('/').filter(Boolean);
  const toSegments = resolve(to).split('/').filter(Boolean);
  let shared = 0;
  while (shared < fromSegments.length && shared < toSegments.length && fromSegments[shared] === toSegments[shared]) {
    shared++;
  }
  return [...fromSegments.slice(shared).map(() => '..'), ...toSegments.slice(shared)].join('/');
}

export interface ParsedPath {
  root: string;
  dir: string;
  base: string;
  ext: string;
  name: string;
}

export function parse(path: string): ParsedPath {
  const base = basename(path);
  const ext = extname(path);
  const dir = path.includes('/') ? dirname(path) : '';
  return { root: isAbsolute(path) ? '/' : '', dir, base, ext, name: ext ? base.slice(0, -ext.length) : base };
}

export function format(parts: Partial<ParsedPath>): string {
  const base = parts.base ?? `${parts.name ?? ''}${parts.ext ?? ''}`;
  const dir = parts.dir ?? parts.root ?? '';
  if (!dir) {
    return base;
  }
  return dir === parts.root ? `${dir}${base}` : `${dir}/${base}`;
}

export function toNamespacedPath(path: string): string {
  return path;
}

export const posix = { sep, delimiter, isAbsolute, normalize, join, resolve, dirname, basename, extname, relative, parse, format, toNamespacedPath };

export default Object.assign(posix, { posix });
