In `paginate`, move the `yield` inside the loop: after fetching one page, yield its items, then decide whether to fetch the next.
---
`yield* page.items` yields each item of the array one at a time and pauses between them, so the next `fetchPage` call only happens after the consumer has pulled them all.
---
In `take`, push inside `for await (const value of source)` and `break` once `values.length` reaches `count`. Breaking calls the source's `return()`, so generators stop producing.
---
`mapAsync` is three lines: `for await (const value of source) { yield await transform(value); }`.
