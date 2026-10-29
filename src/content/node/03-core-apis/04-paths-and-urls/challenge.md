Implement the path and URL helpers of a small static file server. Use `node:path` and `URL`, not string concatenation.

1. `resolveSafe(root: string, userPath: string): string` resolves `userPath` inside the absolute folder `root` and returns the absolute path. Throw `new Error('Path escapes root')` when the result is outside `root` (including absolute inputs like `/etc/passwd` and sibling folders such as `/srv/public-backup` for root `/srv/public`).
2. `buildUrl(base: string, path: string, query: Record<string, string | number | undefined>): string` returns the `href` of `path` appended to `base` (the base may or may not end with `/`; `path` has no leading `/`), with each query entry added as a search parameter, skipping `undefined` values. Example: `buildUrl('https://api.example.com/v1', 'users', { q: 'ada lovelace', page: 2, role: undefined })` is `https://api.example.com/v1/users?q=ada+lovelace&page=2`.
3. `staticFilePath(root: string, requestUrl: string): string` maps a request URL (`/docs/?v=1`) to a file:
   - parse with `new URL(requestUrl, 'http://localhost')` and decode the pathname with `decodeURIComponent`;
   - append `index.html` when the pathname ends with `/`;
   - return `resolveSafe(root, '.' + decodedPathname)` (so `..%2f` tricks throw).
4. `contentType(filePath: string): string` uses the extension (case-insensitive): `.html` `text/html; charset=utf-8`, `.css` `text/css`, `.js` `text/javascript`, `.json` `application/json`, `.png` `image/png`, anything else `application/octet-stream`.
