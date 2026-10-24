Harden a comment section against XSS. All functions and components are **named exports** of `App.jsx`.

### `isSafeUrl(url)`

Return `true` only when the URL's protocol is `http:`, `https:` or `mailto:`. Relative URLs (like `/users/1`) are safe: parse with `new URL(url, 'https://dojo.local')`. Return `false` for `javascript:` (any case, with leading spaces), `data:`, and for anything that cannot be parsed.

### `UserLink({ href, children })`

Render an `<a target="_blank" rel="noopener noreferrer">`. Set `href` only when `isSafeUrl(href)` is true; otherwise render the link **without** an `href` attribute.

### `Comment({ author, text })`

Render an `<article>` with the author in an `<h4>` and the text in a `<p>` **as plain text** (no `dangerouslySetInnerHTML`).

### `sanitizeHtml(html)`

Return a sanitized HTML string using an allowlist:

- Allowed elements: `a`, `b`, `br`, `em`, `i`, `p`, `strong`. Any other element is removed **together with its content**. HTML comments are removed.
- Every attribute is removed, except `href` on `<a>` when `isSafeUrl` accepts it.
- Examples: `<b>Hi</b><script>alert(1)</script>` becomes `<b>Hi</b>`; `<a href="javascript:alert(1)" onclick="steal()">x</a>` becomes `<a>x</a>`.

`RichComment({ html })` is already written and renders `sanitizeHtml(html)`.
