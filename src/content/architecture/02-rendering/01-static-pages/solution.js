const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  txt: 'text/plain; charset=utf-8',
};

const FINGERPRINT = /\.[0-9a-f]{6,}\.[a-z0-9]+$/i;

function extensionOf(filePath) {
  const fileName = filePath.split('/').pop();
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex === -1 ? '' : fileName.slice(dotIndex + 1).toLowerCase();
}

function cacheControlFor(filePath) {
  if (extensionOf(filePath) === 'html') {
    return 'no-cache';
  }
  if (FINGERPRINT.test(filePath)) {
    return 'public, max-age=31536000, immutable';
  }
  return 'public, max-age=3600';
}

function resolveFilePath(files, decodedPath) {
  const relativePath = decodedPath.replace(/^\/+/, '');
  if (relativePath === '' || relativePath.endsWith('/')) {
    return `${relativePath}index.html`;
  }
  if (!(relativePath in files) && `${relativePath}/index.html` in files) {
    return `${relativePath}/index.html`;
  }
  return relativePath;
}

export function serveStatic(files, path) {
  const pathname = path.split(/[?#]/)[0];
  const decodedPath = decodeURIComponent(pathname);

  if (decodedPath.split('/').includes('..')) {
    return {
      status: 403,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      body: 'Forbidden',
    };
  }

  const filePath = resolveFilePath(files, decodedPath);

  if (!(filePath in files)) {
    return {
      status: 404,
      headers: { 'Content-Type': CONTENT_TYPES.html, 'Cache-Control': 'no-cache' },
      body: files['404.html'] ?? 'Not Found',
    };
  }

  return {
    status: 200,
    headers: {
      'Content-Type': CONTENT_TYPES[extensionOf(filePath)] ?? 'application/octet-stream',
      'Cache-Control': cacheControlFor(filePath),
    },
    body: files[filePath],
  };
}
