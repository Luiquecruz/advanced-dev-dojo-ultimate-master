Build the two decisions a layer 7 load balancer makes for every request: which pool serves the path, and which server of that pool gets the request. Randomness is injected (`random()` returns a number in `[0, 1)`, like `Random.Shared.NextDouble()`), so the tests are deterministic.

```csharp
public record Route(string Prefix, string Pool);

public class Router
{
    public Router(IEnumerable<Route> routes);
    public string? Route(string path);
}

public class P2CBalancer
{
    public P2CBalancer(IEnumerable<string> backends, Func<double> random);
    public string Pick();
    public void Release(string name);
    public int InFlight(string name);
}
```

**`new Router(routes).Route(path)`** returns the `Pool` of the matching route, or `null` when no route matches. Prefixes are unique and paths carry no query string.

- A prefix matches on path segments: `path == prefix`, or `path` starts with `prefix + "/"`. The prefix `"/"` matches every path. So `/api` matches `/api` and `/api/users` but not `/apiary`.
- When several prefixes match, the **longest** one wins, whatever the order of `routes`.

**`new P2CBalancer(backends, random)`** balances with the power of two random choices over in-flight counts, which all start at `0`.

- `Pick()` throws an `InvalidOperationException` with the message `no backends` when `backends` is empty and returns the only backend when there is one. Otherwise, with `n` backends, it samples two **distinct** indexes, calling `random()` exactly twice: `first = (int)Math.Floor(random() * n)`, then `second = (int)Math.Floor(random() * (n - 1))`, and if `second >= first`, add `1` to `second`. It picks the backend with fewer requests in flight; on a tie it picks `first`. The picked backend's count goes up by one.
- `Release(name)` lowers the count of that backend by one, never below `0`, and ignores unknown names.
- `InFlight(name)` returns the current count (`0` for an unknown name).
