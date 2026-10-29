import { extname, resolve, sep } from 'node:path';

export function resolveSafe(root: string, userPath: string): string {
  // TODO: resolve inside root and throw 'Path escapes root' when the result leaves it
  return root + '/' + userPath;
}

export function buildUrl(base: string, path: string, query: Record<string, string | number | undefined>): string {
  // TODO: ensure the base ends with '/', resolve path with new URL() and fill searchParams
  return `${base}/${path}`;
}

export function staticFilePath(root: string, requestUrl: string): string {
  // TODO: parse, decode, add index.html for folders, then resolveSafe
  return resolveSafe(root, requestUrl);
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
};

export function contentType(filePath: string): string {
  // TODO: look up the lowercase extension in TYPES
  return 'application/octet-stream';
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
