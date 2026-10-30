function site() {
  return {
    'index.html': '<h1>Home</h1>',
    'about/index.html': '<h1>About</h1>',
    'app.3f9a1c.css': 'body { margin: 0 }',
    'vendor.0a1b2c3d.js': 'console.log("vendor")',
    'logo.svg': '<svg></svg>',
    'robots.txt': 'User-agent: *',
    'data/products.json': '[]',
    'fonts/inter.woff2': 'binary',
    '404.html': '<h1>Page not found</h1>',
    '../secrets.env': 'DATABASE_PASSWORD=hunter2',
  };
}

test('serves index.html for "/" and for folder paths, ignoring the query string and hash', () => {
  const home = mod.serveStatic(site(), '/');
  expect(home.status).toBe(200);
  expect(home.body).toBe('<h1>Home</h1>');
  expect(home.headers['Content-Type']).toBe('text/html; charset=utf-8');
  expect(mod.serveStatic(site(), '/about/').body).toBe('<h1>About</h1>');
  expect(mod.serveStatic(site(), '/about').body).toBe('<h1>About</h1>');
  expect(mod.serveStatic(site(), '/about/?ref=home#team').body).toBe('<h1>About</h1>');
  expect(mod.serveStatic(site(), '/index.html').body).toBe('<h1>Home</h1>');
});

test('sets Content-Type from the file extension', () => {
  const contentType = (path) => mod.serveStatic(site(), path).headers['Content-Type'];
  expect(contentType('/app.3f9a1c.css')).toBe('text/css; charset=utf-8');
  expect(contentType('/vendor.0a1b2c3d.js')).toBe('text/javascript; charset=utf-8');
  expect(contentType('/logo.svg')).toBe('image/svg+xml');
  expect(contentType('/robots.txt')).toBe('text/plain; charset=utf-8');
  expect(contentType('/data/products.json')).toBe('application/json');
  expect(contentType('/fonts/inter.woff2')).toBe('application/octet-stream');
});

test('sets Cache-Control: no-cache for HTML, immutable for fingerprinted assets, one hour for the rest', () => {
  const cacheControl = (path) => mod.serveStatic(site(), path).headers['Cache-Control'];
  expect(cacheControl('/')).toBe('no-cache');
  expect(cacheControl('/about/')).toBe('no-cache');
  expect(cacheControl('/app.3f9a1c.css')).toBe('public, max-age=31536000, immutable');
  expect(cacheControl('/vendor.0a1b2c3d.js')).toBe('public, max-age=31536000, immutable');
  expect(cacheControl('/logo.svg')).toBe('public, max-age=3600');
  expect(cacheControl('/robots.txt')).toBe('public, max-age=3600');
});

test('answers unknown paths with 404 and the 404.html page', () => {
  const missing = mod.serveStatic(site(), '/pricing');
  expect(missing.status).toBe(404);
  expect(missing.body).toBe('<h1>Page not found</h1>');
  expect(missing.headers).toEqual({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  const withoutPage = mod.serveStatic({ 'index.html': '<h1>Home</h1>' }, '/missing.css');
  expect(withoutPage.status).toBe(404);
  expect(withoutPage.body).toBe('Not Found');
});

test('blocks path traversal with 403, including encoded dots', () => {
  for (const path of ['/../secrets.env', '/about/../../secrets.env', '/%2e%2e/secrets.env']) {
    const response = mod.serveStatic(site(), path);
    expect(response.status).toBe(403);
    expect(response.body).toBe('Forbidden');
    expect(response.headers).toEqual({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  }
});
