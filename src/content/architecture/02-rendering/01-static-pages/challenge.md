Write the core of a static file server. There is no disk: the site is an object that maps file paths (relative to the web root) to their contents.

```js
const files = {
  'index.html': '<h1>Home</h1>',
  'about/index.html': '<h1>About</h1>',
  'app.3f9a1c.css': 'body { margin: 0 }',
  'logo.svg': '<svg></svg>',
  '404.html': '<h1>Page not found</h1>',
};
```

Export `serveStatic(files, path)` from `server.js`. It returns `{ status, headers, body }`, where `headers` has exactly two keys: `'Content-Type'` and `'Cache-Control'`.

**Resolving the path**

- Ignore the query string and the hash (`/about/?ref=home` resolves like `/about/`).
- Decode the path with `decodeURIComponent` before using it.
- `/` and every path ending in `/` map to the `index.html` of that folder (`/about/` → `about/index.html`).
- A path without a trailing slash that is a folder also serves its index (`/about` → `about/index.html`).

**Responses**

- Found: status `200`, the file content as `body`.
- Not found: status `404`, the content of `404.html` as `body` (or `'Not Found'` when the site has no `404.html`), served as HTML with `no-cache`.
- Path traversal: when any segment of the decoded path is `..`, return status `403`, body `'Forbidden'`, `Content-Type` `text/plain; charset=utf-8` and `Cache-Control` `no-store`. This holds even when the files object contains a matching key.

**`Content-Type` by extension**

| Extension | Content-Type |
| --- | --- |
| `.html` | `text/html; charset=utf-8` |
| `.css` | `text/css; charset=utf-8` |
| `.js` | `text/javascript; charset=utf-8` |
| `.json` | `application/json` |
| `.svg` | `image/svg+xml` |
| `.png` | `image/png` |
| `.txt` | `text/plain; charset=utf-8` |
| anything else | `application/octet-stream` |

**`Cache-Control`**

- HTML files: `no-cache`.
- Fingerprinted files, whose name has a hash of at least 6 hexadecimal characters before the extension (`app.3f9a1c.css`, `vendor.0a1b2c3d.js`): `public, max-age=31536000, immutable`.
- Every other file: `public, max-age=3600`.
