Sanitize model output before it is rendered: check URLs against a host allowlist, remove every markdown and HTML construct that could send data to another host, strip data from allowed image URLs, encode text for its target context, and wire it into a question-answering call over an untrusted document.

A **policy** is `{"allowedHosts": [...]}`, a list of exact hostnames. Results are plain dicts whose keys keep the JSON names.

## 1. `check_url(url, allowed_hosts)`

Return `{"allowed": True, "url": parsed}` (the result of `urllib.parse.urlsplit`) or `{"allowed": False, "reason": reason}`, applying these checks in order:

1. the URL cannot be parsed, has no scheme (relative paths included) or an `https` URL has no host → `"invalid_url"`;
2. the scheme is not `https` → `"scheme"`;
3. a username or password is present → `"credentials"`;
4. an explicit port is present → `"port"`;
5. the hostname, lowercase and without a trailing dot, is not exactly one of `allowed_hosts` (compared lowercase) → `"not_allowlisted"`.

## 2. `sanitize_markdown(markdown, policy)`

Return `{"markdown", "removed"}`. Each entry of `"removed"` is `{"kind", "value", "reason"}`, where `"value"` is the URL (or the whole tag for HTML) and `"reason"` is the `check_url` reason, `"query_string"` or `"html"`, in the order found.

First, **reference definitions**: a line `[id]: url` (up to 3 leading spaces, the URL optionally in `<>`). Remove the whole line (keep the line break) when the URL is not allowed (kind `"reference"`), or when it is allowed but has a query string or fragment (reason `"query_string"`). Keep allowed definitions unchanged.

Then, in **one pass** over the result (text produced by a replacement is never processed again), find these constructs, case-insensitive:

| Kind | Syntax | Allowed URL | Otherwise |
| --- | --- | --- | --- |
| `autolink` | `<https://...>` | keep | `[link removed]` |
| `image` | `![alt](url)` or `![alt](url "title")` | keep; if it has a query string or fragment, write `![alt](url without them)` and record `"query_string"` | `[image removed]` |
| `link` | `[text](url)` or with a title | keep unchanged | `text` |
| `html` | any tag `<name ...>` or `</name>` | (no URL check) | removed (empty string), reason `"html"` |
| `bare_url` | `http://` or `https://` followed by characters other than whitespace, `<>()[]"'` and backtick | keep | `[link removed]` |

For a bare URL, trailing `.`, `,`, `;`, `:`, `!` or `?` characters are punctuation: check the URL without them and keep them after the replacement.

Text with no construct (including `3 < 5`) is unchanged, and a clean answer returns `"removed": []`.

## 3. `encode_for_context(value, context)`

- `"html-text"`: replace `&`, `<`, `>` with `&amp;`, `&lt;`, `&gt;` (ampersand first);
- `"html-attribute"`: the same, plus `"` → `&quot;` and `'` → `&#x27;`;
- `"url-component"`: percent-encode like JavaScript's `encodeURIComponent` (UTF-8, keeping only letters, digits and `-_.!~*'()`);
- any other context: raise an exception whose message contains it.

## 4. `answer_safely(model, *, question, document, policy)`

Call `await model.generate(request)` once. The system message holds your instructions only; the document goes in the **user** message (with the question), because it is untrusted. Return `sanitize_markdown` of the reply text.

The tests send a different injected payload on each seed (inline, reference-style, HTML, autolinks, bare URLs, credentials tricks, uppercase schemes, allowlisted hosts with data in the query) and check that no attacker host and no secret survives.
