Start both requests before awaiting either: `const [userResult, postsResult] = await Promise.all([...])`. Two `await fetch(...)` lines in a row run one after the other.
---
`Promise.all` rejects as soon as one promise rejects, which would fail the whole page when the posts service is unreachable. Wrap each call in a small helper that never throws and returns `{ ok, status, data }` (a `try/catch` around `fetch` and `response.json()`), or use `Promise.allSettled`.
---
Decide in order: user 404 → 404; user not OK → 502; posts not OK → degraded body; otherwise the full view model. For the posts, copy the array before sorting (`[...posts].sort((first, second) => second.id - first.id)`), then `slice(0, 3)` and map to `{ id, title }`.
