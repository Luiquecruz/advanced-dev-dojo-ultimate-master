Build the two decisions a layer 7 load balancer makes for every request: which pool serves the path, and which server of that pool gets the request. Randomness is injected (`random()` returns a number in `[0, 1)`, like `random.random`), so the tests are deterministic.

```python
routes = [{"prefix": "/api", "pool": "api"}, {"prefix": "/", "pool": "web"}]

class Router:
    def __init__(self, routes: list[dict]): ...
    def route(self, path: str) -> str | None: ...

class P2CBalancer:
    def __init__(self, backends: list[str], random: Callable[[], float]): ...
    def pick(self) -> str: ...
    def release(self, name: str) -> None: ...
    def in_flight(self, name: str) -> int: ...
```

**`Router(routes).route(path)`** returns the `"pool"` of the matching route, or `None` when no route matches. Prefixes are unique and paths carry no query string.

- A prefix matches on path segments: `path == prefix`, or `path` starts with `prefix + "/"`. The prefix `"/"` matches every path. So `/api` matches `/api` and `/api/users` but not `/apiary`.
- When several prefixes match, the **longest** one wins, whatever the order of `routes`.

**`P2CBalancer(backends, random)`** balances with the power of two random choices over in-flight counts, which all start at `0`.

- `pick()` raises `RuntimeError("no backends")` when `backends` is empty and returns the only backend when there is one. Otherwise, with `n = len(backends)`, it samples two **distinct** indexes, calling `random()` exactly twice: `first = int(random() * n)`, then `second = int(random() * (n - 1))`, and if `second >= first`, add `1` to `second`. It picks the backend with fewer requests in flight; on a tie it picks `first`. The picked backend's count goes up by one.
- `release(name)` lowers the count of that backend by one, never below `0`, and ignores unknown names.
- `in_flight(name)` returns the current count (`0` for an unknown name).
