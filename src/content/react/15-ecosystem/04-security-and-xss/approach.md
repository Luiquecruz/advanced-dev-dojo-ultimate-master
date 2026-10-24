1. Implement `isSafeUrl` with the `URL` parser and a protocol allowlist; treat parse errors as unsafe.
2. Use it in `UserLink` so unsafe links lose their `href`, and add `rel="noopener noreferrer"`.
3. Remove `dangerouslySetInnerHTML` from `Comment`: React escapes text automatically.
4. For `sanitizeHtml`, parse the string inside an inert `<template>`.
5. Walk the nodes recursively. Copy each child list before iterating because you remove nodes while looping.
6. Drop comments and disallowed elements entirely; on allowed elements, remove every attribute except a safe `href` on links.
7. Serialize with `template.innerHTML`. Remember that in real projects DOMPurify does this job with far more edge cases covered.
