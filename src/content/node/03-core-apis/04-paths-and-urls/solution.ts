import { extname, resolve, sep } from 'node:path';

export function resolveSafe(root: string, userPath: string): string {
  const base = resolve(root);
  const target = resolve(base, userPath);
  if (target !== base && !target.startsWith(base + sep)) {
    throw new Error('Path escapes root');
  }
  return target;
}

export function buildUrl(base: string, path: string, query: Record<string, string | number | undefined>): string {
  const url = new URL(path, base.endsWith('/') ? base : `${base}/`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.href;
}

export function staticFilePath(root: string, requestUrl: string): string {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname);
  const file = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  return resolveSafe(root, `.${file}`);
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
};

export function contentType(filePath: string): string {
  return TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream';
}

function main() {
  console.log(staticFilePath('/srv/public', '/docs/?v=1'));
  console.log(contentType('/srv/public/logo.PNG'));
  console.log(buildUrl('https://api.example.com/v1', 'users', { q: 'ada lovelace', page: 2, role: undefined }));
  try {
    staticFilePath('/srv/public', '/..%2f..%2fetc%2fpasswd');
  } catch (error) {
    console.log('blocked:', (error as Error).message);
  }
}

main();
