For `isSafeUrl`, wrap `new URL(url, 'https://dojo.local')` in `try/catch` and check `allowedProtocols.includes(parsed.protocol)`. The parser lowercases the scheme and strips leading spaces for you.
---
`UserLink`: `href={isSafeUrl(href) ? href : undefined}` (React omits attributes whose value is `undefined`). `Comment`: just `<p>{text}</p>`.
---
For `sanitizeHtml`, create `document.createElement('template')`, assign `template.innerHTML = html`, clean `template.content` and return `template.innerHTML`. A template's content is inert: scripts do not run and images do not load.
---
Write a recursive `clean(parent)` that loops over a **copy** of `parent.childNodes` (`[...parent.childNodes]`): remove comment nodes, remove elements whose `tagName` is not in `allowedTags`, remove each attribute except a safe `href` on `A`, then call `clean` on the kept element.
