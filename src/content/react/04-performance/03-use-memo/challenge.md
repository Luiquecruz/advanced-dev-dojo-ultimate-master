`Dashboard` computes order statistics on **every** render, including renders caused by the theme toggle. Worse, the result is a new object each time, so the memoized `Chart` re-renders too.

Cache the calculation with `useMemo`:

- `Dashboard` (default export) receives `orders`, `computeStats` (defaults to the exported `summarizeOrders`) and `onChartRender`.
- Compute `stats` with `useMemo`, calling `computeStats(orders)`. List **every** value the calculation reads as a dependency.
- Clicking the `Dark mode` / `Light mode` button toggles the `<main>` class between `light` and `dark` and must **not** call `computeStats` again nor re-render `Chart`.
- Passing a new `orders` array must recompute and show the new `{count} orders` and `Total: ${total}`.

Do not change `summarizeOrders` or `Chart`.
