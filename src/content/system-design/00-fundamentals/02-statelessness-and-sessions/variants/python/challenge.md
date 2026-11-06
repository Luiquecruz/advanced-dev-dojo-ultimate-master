Model two copies of a server that share one session store, so a user who logs in on one copy is recognized by the other. Time is injected: `now()` returns the current time in milliseconds, so the tests can move the clock without waiting.

```python
class SessionStore:
    def __init__(self, *, ttl_ms, now): ...  # keyword arguments: SessionStore(ttl_ms=1_000, now=clock.now)
    def create(self, user) -> str: ...
    def get(self, session_id) -> str | None: ...
    def destroy(self, session_id) -> None: ...


class Server:
    def __init__(self, name, store): ...     # keeps the name as self.name
    def login(self, user) -> str: ...
    def who_am_i(self, session_id) -> dict: ...
    def logout(self, session_id) -> dict: ...
```

**The store** (`SessionStore`):

- `create(user)` stores a session for `user` that expires `ttl_ms` after `now()` and returns a new, unique session id (the starter already uses `str(uuid.uuid4())`).
- `get(session_id)` returns the user of a live session. It returns `None` for an unknown id and for an expired one: a session created at time `t` is valid while `now() < t + ttl_ms`. An expired session is removed from the store.
- `destroy(session_id)` removes the session. An unknown id is ignored.

**A server** (`Server`) keeps no session data of its own; every method goes through the `store` it was given:

| Method | Result |
| --- | --- |
| `login(user)` | the session id returned by the store |
| `who_am_i(session_id)` | `{"status": 200, "body": {"user": user, "server": name}}` for a live session, otherwise `{"status": 401, "body": {"error": "not logged in"}}` |
| `logout(session_id)` | removes the session from the store and returns `{"status": 204}` |

A session created through server `a` must work on server `b` when both share the store, and a logout on either ends it for both.
