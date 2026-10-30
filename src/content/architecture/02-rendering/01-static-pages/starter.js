const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json',
  svg: 'image/svg+xml',
  png: 'image/png',
  txt: 'text/plain; charset=utf-8',
};

export function serveStatic(files, path) {
  // TODO: ignore the query string and the hash, then decode the path
  // TODO: reject any ".." segment with 403 Forbidden
  // TODO: map "/" and folder paths to their index.html
  const filePath = path.slice(1);

  if (!(filePath in files)) {
    // TODO: answer with the 404.html page and the right headers
    return { status: 404, headers: {}, body: 'Not Found' };
  }

  // TODO: pick Content-Type from the extension and Cache-Control from the file kind
  return {
    status: 200,
    headers: { 'Content-Type': CONTENT_TYPES.html, 'Cache-Control': 'no-cache' },
    body: files[filePath],
  };
}
