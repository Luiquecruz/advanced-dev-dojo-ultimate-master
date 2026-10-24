`useMemo(calculate, dependencies)` runs `calculate` on the first render and then only when a dependency changes (compared with `Object.is`).
---
The calculation reads two values from the component scope: `orders` and `computeStats`. Both belong in the dependency array.
---
`const stats = useMemo(() => computeStats(orders), [computeStats, orders]);` Because `stats` is now the same object between theme toggles, `memo(Chart)` can skip rendering as well.
