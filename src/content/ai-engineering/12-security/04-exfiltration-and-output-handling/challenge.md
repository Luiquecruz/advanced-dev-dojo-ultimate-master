Sanitize model output before it is rendered: check URLs against a host allowlist, remove every markdown and HTML construct that could send data to another host, strip data from allowed image URLs, encode text for its target context, and wire it into a question-answering call over an untrusted document.

A **policy** is `{ allowedHosts }`, a list of exact hostnames.

## 1. `checkUrl(url, allowedHosts)`

Return `{ allowed: true, url }` (the parsed `URL`) or `{ allowed: false, reason }`, applying these checks in order:

1. `new URL(url)` throws (relative paths included) → `'invalid_url'`;
2. the protocol is not `https:` → `'scheme'`;
3. a username or password is present → `'credentials'`;
4. an explicit port is present → `'port'`;
5. the hostname, lowercase and without a trailing dot, is not exactly one of `allowedHosts` (compared lowercase) → `'not_allowlisted'`.

## 2. `sanitizeMarkdown(markdown, policy)`

Return `{ markdown, removed }`. Each entry of `removed` is `{ kind, value, reason }`, where `value` is the URL (or the whole tag for HTML) and `reason` is the `checkUrl` reason, `'query_string'` or `'html'`, in the order found.

First, **reference definitions**: a line `[id]: url` (up to 3 leading spaces, the URL optionally in `<>`). Remove the whole line (keep the line break) when the URL is not allowed (kind `'reference'`), or when it is allowed but has a query string or fragment (reason `'query_string'`). Keep allowed definitions unchanged.

Then, in **one pass** over the result (text produced by a replacement is never processed again), find these constructs, case-insensitive:

| Kind | Syntax | Allowed URL | Otherwise |
| --- | --- | --- | --- |
| `autolink` | `<https://...>` | keep | `[link removed]` |
| `image` | `![alt](url)` or `![alt](url "title")` | keep; if it has a query string or fragment, write `![alt](url without them)` and record `'query_string'` | `[image removed]` |
| `link` | `[text](url)` or with a title | keep unchanged | `text` |
| `html` | any tag `<name ...>` or `</name>` | (no URL check) | removed (empty string), reason `'html'` |
| `bare_url` | `http://` or `https://` followed by characters other than whitespace, `<>()[]"'` and backtick | keep | `[link removed]` |

For a bare URL, trailing `.`, `,`, `;`, `:`, `!` or `?` characters are punctuation: check the URL without them and keep them after the replacement.

Text with no construct (including `3 < 5`) is unchanged, and a clean answer returns `removed: []`.

## 3. `encodeForContext(value, context)`

- `'html-text'`: replace `&`, `<`, `>` with `&amp;`, `&lt;`, `&gt;` (ampersand first);
- `'html-attribute'`: the same, plus `"` → `&quot;` and `'` → `&#x27;`;
- `'url-component'`: `encodeURIComponent(value)`;
- any other context: throw an `Error` whose message contains it.

## 4. `answerSafely(model, { question, document, policy })`

Call `model.generate` once. The system message holds your instructions only; the document goes in the **user** message (with the question), because it is untrusted. Return `sanitizeMarkdown` of the reply text.

The tests send a different injected payload on each seed (inline, reference-style, HTML, autolinks, bare URLs, credentials tricks, uppercase schemes, allowlisted hosts with data in the query) and check that no attacker host and no secret survives.
