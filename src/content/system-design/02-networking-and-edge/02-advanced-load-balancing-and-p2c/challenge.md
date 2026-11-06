Build the two decisions a layer 7 load balancer makes for every request: which pool serves the path, and which server of that pool gets the request. Randomness is injected (`random()` returns a number in `[0, 1)`, like `Math.random`), so the tests are deterministic.

```ts
interface Route { prefix: string; pool: string }

export function createRouter(routes: Route[]): { route(path: string): string | null }
export function createP2C(backends: string[], random: () => number): {
  pick(): string;
  release(name: string): void;
  inFlight(name: string): number;
}
```

**`createRouter(routes).route(path)`** returns the `pool` of the matching route, or `null` when no route matches. Prefixes are unique and paths carry no query string.

- A prefix matches on path segments: `path === prefix`, or `path` starts with `prefix + '/'`. The prefix `'/'` matches every path. So `/api` matches `/api` and `/api/users` but not `/apiary`.
- When several prefixes match, the **longest** one wins, whatever the order of `routes`.

**`createP2C(backends, random)`** balances with the power of two random choices over in-flight counts, which all start at `0`.

- `pick()` throws an `Error` with the message `no backends` when `backends` is empty and returns the only backend when there is one. Otherwise, with `n = backends.length`, it samples two **distinct** indexes, calling `random()` exactly twice: `first = Math.floor(random() * n)`, then `second = Math.floor(random() * (n - 1))`, and if `second >= first`, add `1` to `second`. It picks the backend with fewer requests in flight; on a tie it picks `first`. The picked backend's count goes up by one.
- `release(name)` lowers the count of that backend by one, never below `0`, and ignores unknown names.
- `inFlight(name)` returns the current count (`0` for an unknown name).
