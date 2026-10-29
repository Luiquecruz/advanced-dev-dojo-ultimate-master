`resolve(root, userPath)` gives an absolute path and applies every `..`. The only question left is whether the result still starts with the root.
---
Compare with the separator: `target === base || target.startsWith(base + sep)`. Without `+ sep`, `/srv/public-backup` would pass a check for `/srv/public`.
---
`buildUrl`: `new URL(path, base.endsWith('/') ? base : base + '/')`, then `url.searchParams.set(key, String(value))` for each defined value and return `url.href`. `staticFilePath`: `decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname)`, add `index.html` when it ends with `/`, and call `resolveSafe(root, '.' + pathname)`.
