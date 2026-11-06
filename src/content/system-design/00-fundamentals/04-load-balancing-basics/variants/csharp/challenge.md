Write the server picker of a load balancer: round robin over a pool, skipping the servers that health checks have marked down.

```csharp
public class RoundRobin(IEnumerable<string> servers)
{
    public string Next();
    public void MarkDown(string name);
    public void MarkUp(string name);
    public IReadOnlyList<string> Healthy();
}
```

The tests create the balancer with a collection expression: `new RoundRobin(["a", "b", "c"])`.

- `Next()` returns the next server in the order of `servers`, wrapping around after the last one. The first call returns the first healthy server.
- Servers marked down are skipped: `Next()` returns the first healthy server **after the last one it returned**, in list order. With `a, b, c, d, e`, after `a` and `b` were returned and `a`, `c` and `d` were marked down, the next calls return `e, b, e, b`. The search also starts from the last server returned when that server has been marked down since: if `b` then goes down and `a` comes back, the next calls return `e, a, e`. A down server is never returned, and no healthy server is skipped.
- `MarkDown(name)` takes a server out of the rotation; `MarkUp(name)` puts it back at its original place in the order. Names that are not in the pool are ignored.
- `Healthy()` returns the servers that are not marked down, in the original order.
- When no server is healthy (every server is down, or the pool is empty), `Next()` throws an `InvalidOperationException` with the message `"no healthy servers"`. After a `MarkUp`, it works again.
