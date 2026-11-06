The starter's server keeps its own `localSessions` map, which is exactly why server `b` cannot see a login made on server `a`. Delete that map and route `login`, `whoAmI` and `logout` through `store`.
---
In the store, `get` must compare the clock with the record: `if (options.now() >= record.expiresAt)`, delete the id and return `undefined`. The record already stores `expiresAt` at creation time.
---
`login(user)` is just `return store.create(user)`. `whoAmI` calls `store.get(sessionId)` and answers `401` when it returns `undefined`. `logout` calls `store.destroy(sessionId)` (which runs `sessions.delete(sessionId)`) and returns `{ status: 204 }`.
