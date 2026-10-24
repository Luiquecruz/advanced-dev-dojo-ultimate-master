1. Notice two separate costs: the calculation itself and the `Chart` re-render caused by a new `stats` object.
2. Wrap the call in `useMemo` with an arrow function that returns `computeStats(orders)`.
3. Build the dependency array from every reactive value the function reads: `orders` and `computeStats`.
4. Toggling the theme changes only `dark`, which is not a dependency, so React returns the cached object.
5. The cached object keeps the same reference, so `memo(Chart)` sees equal props and skips rendering.
