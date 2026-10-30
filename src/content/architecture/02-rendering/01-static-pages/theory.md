## The baseline: files on a disk

Before any framework, a website was a folder of hand-written files. A web server (Apache, later Nginx), an object store (S3) or a static host (GitHub Pages, Netlify, a CDN) maps the URL path to a file and sends its bytes back. Nothing is computed per request.

```
site/
  index.html          → https://example.com/
  about/index.html    → https://example.com/about/
  styles.css
  404.html
```

Every rendering model in this module answers three questions. For static pages the answers are the simplest possible:

| Question | Static pages |
| --- | --- |
| Where is the HTML generated? | In the author's editor |
| When? | Before deployment, by a human |
| How much JS reaches the client? | Zero, unless you add some by hand |

That makes static pages the **baseline** to compare every other model against: nothing else beats them on time to first byte, cost or attack surface, because there is no application server to slow down, scale or exploit.

## What the server actually does

Even "just serving files" has rules, and every later model (SSG, ISR, CDNs in front of SSR) still relies on them:

1. **Path to file.** `/` and any path ending in `/` map to `index.html` in that folder. Nginx calls this `index index.html;` and `try_files $uri $uri/ =404;`.
2. **Content type.** The browser trusts the `Content-Type` header, not the file name. A stylesheet served as `text/plain` is ignored.
3. **Not found.** A missing path returns status `404` with a friendly `404.html` body. Returning `200` with an error page (a "soft 404") confuses crawlers.
4. **Path traversal.** A request for `/../../etc/passwd` must never escape the web root. Servers normalize the path and reject `..` segments, including encoded ones (`%2e%2e`).
5. **Caching.** This is where performance is won.

```http
HTTP/1.1 200 OK
Content-Type: text/css; charset=utf-8
Cache-Control: public, max-age=31536000, immutable
```

## Cache headers and fingerprinting

HTML must stay fresh: if a browser caches `index.html` for a year, users never see your next deploy. Assets are the opposite: you want them cached forever. The standard trick is **fingerprinting**: put a content hash in the file name (`app.3f9a1c.css`). When the content changes, the name changes, so the old URL can be cached permanently.

| File | Cache-Control | Why |
| --- | --- | --- |
| `*.html` | `no-cache` | Stored, but revalidated on every use (`ETag`, `304 Not Modified`) |
| `app.3f9a1c.css` | `public, max-age=31536000, immutable` | The name changes when the content does |
| `logo.svg` | `public, max-age=3600` | Not fingerprinted: cache briefly |

`no-cache` does not mean "do not cache"; it means "check with the server first". `no-store` is the one that forbids storing.

## The costs

Static pages solved the problem of serving documents cheaply and reliably. Their costs are what pushed the web toward server-side frameworks:

- **Duplication.** The header, navigation and footer are copied into every file. Changing one menu item means editing every page (server-side includes and later templates were the first fix).
- **No dynamic data.** A product price lives in the HTML. Changing it means editing and redeploying files. There is no search, no login, no per-user content.
- **Manual consistency.** Links between pages are typed by hand and break silently.

## Pitfalls

- Serving HTML with a long `max-age`: users are stuck on an old version until the cache expires.
- Caching non-fingerprinted assets as `immutable`: a fixed bug in `logo.svg` never reaches returning visitors.
- Building file paths by string concatenation without rejecting `..`.
- Answering unknown paths with `200` and the home page (SPA fallback) on a site that is not a SPA.

## When to choose it

Choose plain static files for content that changes rarely and is the same for everyone: landing pages, documentation, portfolios, status pages, legal pages. They are cheap, fast and secure by default. As soon as you need shared layouts across many pages, use a static site generator (lesson 05) instead of copying HTML by hand. As soon as you need per-request data, move to a server model (MVC or SSR).
