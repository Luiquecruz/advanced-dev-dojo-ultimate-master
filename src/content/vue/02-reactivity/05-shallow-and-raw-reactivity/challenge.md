Optimize the chart state in `main.ts` (no preview; the tests import your exports).

1. `points` must be a **`shallowRef<Point[]>`** (initially `[]`), so the point objects are not proxied.
2. `addPoint(point)` must **replace** `points.value` with a new array that contains the new point at the end.
3. `movePoint(index, x, y)` must **mutate** the existing point object in place and then call **`triggerRef(points)`** so dependents update.
4. `chart` stays a `reactive({ title, engine })`, but `engine` must be wrapped in **`markRaw`** so the `ChartEngine` instance is never proxied.
5. `snapshotSettings()` must return a deep, plain copy of `settings` built with **`structuredClone(toRaw(settings))`**. (Calling `structuredClone` on the proxy throws.)
