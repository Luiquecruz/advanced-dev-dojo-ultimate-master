Write the server picker of a load balancer: round robin over a pool, skipping the servers that health checks have marked down.

```ts
interface RoundRobin {
  next(): string;
  markDown(name: string): void;
  markUp(name: string): void;
  healthy(): string[];
}

export function createRoundRobin(servers: string[]): RoundRobin
```

- `next()` returns the next server in the order of `servers`, wrapping around after the last one. The first call returns the first healthy server.
- Servers marked down are skipped: `next()` returns the first healthy server **after the last one it returned**, in list order. With `a, b, c, d, e`, after `a` and `b` were returned and `a`, `c` and `d` were marked down, the next calls return `e, b, e, b`. The search also starts from the last server returned when that server has been marked down since: if `b` then goes down and `a` comes back, the next calls return `e, a, e`. A down server is never returned, and no healthy server is skipped.
- `markDown(name)` takes a server out of the rotation; `markUp(name)` puts it back at its original place in the order. Names that are not in the pool are ignored.
- `healthy()` returns the servers that are not marked down, in the original order.
- When no server is healthy (every server is down, or the pool is empty), `next()` throws an `Error` with the message `'no healthy servers'`. After a `markUp`, it works again.
