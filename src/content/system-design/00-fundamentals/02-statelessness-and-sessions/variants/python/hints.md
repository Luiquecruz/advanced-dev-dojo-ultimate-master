The starter's server keeps its own `self._local_sessions` dict, which is exactly why server `b` cannot see a login made on server `a`. Delete that dict and route `login`, `who_am_i` and `logout` through `self._store`.
---
In the store, `get` must compare the clock with the record: `if self._now() >= record["expires_at"]:` delete the id and return `None`. The record already stores `"expires_at"` at creation time.
---
`login(user)` is just `return self._store.create(user)`. `who_am_i` calls `self._store.get(session_id)` and answers `401` when it returns `None`. `logout` calls `self._store.destroy(session_id)` (which runs `self._sessions.pop(session_id, None)`, so an unknown id raises no `KeyError`) and returns `{"status": 204}`.
