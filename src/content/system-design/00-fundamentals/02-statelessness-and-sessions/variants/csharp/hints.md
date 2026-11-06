The starter's server keeps its own `_localSessions` dictionary, which is exactly why server `b` cannot see a login made on server `a`. Delete that dictionary and route `Login`, `WhoAmI` and `Logout` through `store`.
---
In the store, `Get` must compare the clock with the record: `if (now() >= record.ExpiresAt)`, remove the id and return `null`. The record already stores `ExpiresAt` at creation time.
---
`Login(user)` is just `store.Create(user)`. `WhoAmI` calls `store.Get(sessionId)` and answers `401` when it returns `null`. `Logout` calls `store.Destroy(sessionId)` (which runs `_sessions.Remove(sessionId)`; `Remove` returns `false` for an unknown id instead of throwing) and returns `new HttpResponse(204)`.
