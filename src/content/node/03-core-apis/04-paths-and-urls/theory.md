# Paths and URLs

Two string types cause a surprising number of backend bugs: file paths and URLs. Both look easy to build with template strings, and both have a dedicated API that gets the edge cases right.

## `node:path`

```ts
import { join, resolve, dirname, basename, extname, relative, sep } from 'node:path';

join('uploads', 'avatars', '../ada.png');      // 'uploads/ada.png'   normalizes
resolve('/srv/app', 'public', 'logo.svg');     // '/srv/app/public/logo.svg'
resolve('/srv/app', '/etc/passwd');            // '/etc/passwd'   an absolute segment wins
dirname('/srv/app/public/logo.svg');           // '/srv/app/public'
basename('/srv/app/public/logo.svg');          // 'logo.svg'
extname('archive.tar.gz');                     // '.gz'
relative('/srv/app', '/srv/app/public/a.css'); // 'public/a.css'
```

| Function | Returns | Remember |
| --- | --- | --- |
| `join(...parts)` | a normalized path, relative if the first part is relative | does not consult the disk or cwd |
| `resolve(...parts)` | always an absolute path | processes right to left; an absolute part resets everything before it; falls back to `process.cwd()` |
| `normalize(p)` | removes `.`, `..`, duplicate separators | does not make a path safe |

Use `path` instead of `'a/' + b`: it handles duplicate slashes, `..` and, with `path.win32`, Windows separators. In ES modules there is no `__dirname`; Node 20.11+ offers `import.meta.dirname`, and older code uses `dirname(fileURLToPath(import.meta.url))`.

## Path traversal

Serving `/files/:name` by joining user input to a folder is the classic vulnerability:

```ts
join('/srv/public', '../../etc/passwd');   // '/etc/passwd'
```

The guard: resolve the final absolute path, then check that it is still inside the root. Compare against the root **plus the separator**, otherwise `/srv/public-backup` passes a check for `/srv/public`:

```ts
const root = resolve('/srv/public');
const target = resolve(root, userPath);
if (target !== root && !target.startsWith(root + sep)) {
  throw new Error('Path escapes root');
}
```

Decode first, check after. Attackers send `..%2f..%2fetc%2fpasswd`: the URL parser leaves `%2f` encoded, so a check on the raw pathname sees no `..` segment, and `decodeURIComponent` turns it into a traversal afterwards. Symbolic links inside the root can still point outside; when that matters, compare `fs.realpath` results. Prefer not to put user input in paths at all: store uploads under generated ids and keep the original name in a database.

## The WHATWG `URL`

`URL` is the same class you use in the browser, global in Node:

```ts
const url = new URL('/v1/users?page=2', 'https://api.example.com');
url.pathname;                    // '/v1/users'
url.searchParams.get('page');    // '2'
url.searchParams.set('q', 'ada lovelace & co');
url.href;  // 'https://api.example.com/v1/users?page=2&q=ada+lovelace+%26+co'
```

`searchParams` encodes values for you; concatenating `?q=${q}` breaks on `&`, `#` and spaces, and lets input inject extra parameters. Two traps:

- **Relative resolution follows browser rules.** `new URL('users', 'https://api.example.com/v1')` is `https://api.example.com/users`: without a trailing slash, `v1` is treated as a file and replaced. Ensure the base ends with `/` and the path has no leading `/`.
- **`URL` normalizes dot segments.** `new URL('/a/../b', base).pathname` is `/b`, and `%2e%2e` counts as `..` too. Encoded slashes (`%2f`) are not touched.

`url.parse()` and `querystring` are legacy: they accept malformed input differently from browsers, which has caused security bugs. Use `new URL()` and `URLSearchParams`.

## Paths and URLs meet: static files

A static file server maps a URL pathname to a file: parse the URL, decode the pathname, add `index.html` for folders, resolve inside the root with the guard, and choose `Content-Type` from `extname`. Frameworks ship this as `serveStatic`; knowing the steps lets you review it.

## When to choose it

Always use `node:path` for file paths and `URL` / `URLSearchParams` for URLs; string concatenation is never the better trade-off. Choose `resolve` when you need an absolute path to compare or open, `join` when composing relative pieces. For files that users request by name, prefer generated ids over user-controlled paths; when you must accept a path, apply the root guard after decoding. For serving assets in production, prefer a CDN or object storage over Node.

## Working with AI

Ask for "resolve inside a root directory with a traversal guard" explicitly; assistants often stop at `path.join(root, input)`. Review for:

- user input reaching `join`/`resolve` without a containment check;
- `startsWith(root)` without the trailing separator;
- the check done before `decodeURIComponent`;
- query strings built with template strings instead of `URLSearchParams`;
- `url.parse()` or `querystring` in new code;
- base URLs without a trailing slash combined with relative paths.
