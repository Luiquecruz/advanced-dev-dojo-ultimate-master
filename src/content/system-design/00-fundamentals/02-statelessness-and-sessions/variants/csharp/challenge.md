Model two copies of a server that share one session store, so a user who logs in on one copy is recognized by the other. Time is injected: `now()` returns the current time in milliseconds, so the tests can move the clock without waiting.

```csharp
public record HttpResponse(int Status, object? Body = null);
public record UserBody(string User, string Server);
public record ErrorBody(string Error);

public class SessionStore(long ttlMs, Func<long> now)
{
    public string Create(string user);
    public string? Get(string sessionId);
    public void Destroy(string sessionId);
}

public class Server(string name, SessionStore store)
{
    public string Name { get; }
    public string Login(string user);
    public HttpResponse WhoAmI(string sessionId);
    public HttpResponse Logout(string sessionId);
}
```

The tests create the store with named arguments, `new SessionStore(ttlMs: 1_000, now: () => clock.Now)`, and each server with `new Server("a", store)`.

**The store** (`SessionStore`):

- `Create(user)` stores a session for `user` that expires `ttlMs` after `now()` and returns a new, unique session id (the starter already uses `Guid.NewGuid()`).
- `Get(sessionId)` returns the user of a live session. It returns `null` for an unknown id and for an expired one: a session created at time `t` is valid while `now() < t + ttlMs`. An expired session is removed from the store.
- `Destroy(sessionId)` removes the session. An unknown id is ignored.

**A server** (`Server`) keeps no session data of its own; every method goes through the `store` it was given:

| Method | Result |
| --- | --- |
| `Login(user)` | the session id returned by the store |
| `WhoAmI(sessionId)` | `new HttpResponse(200, new UserBody(user, Name))` for a live session, otherwise `new HttpResponse(401, new ErrorBody("not logged in"))` |
| `Logout(sessionId)` | removes the session from the store and returns `new HttpResponse(204)`, with no body |

A session created through server `a` must work on server `b` when both share the store, and a logout on either ends it for both.
