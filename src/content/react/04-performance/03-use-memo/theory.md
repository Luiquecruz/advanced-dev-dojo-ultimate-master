## Caching a calculation between renders

Every time a component renders, all the code in its body runs again. Most of it is cheap. When a calculation is expensive, or when its result must keep the same identity, cache it with `useMemo`:

```jsx
import { useMemo } from 'react';

function ProductTable({ products, query }) {
  const visible = useMemo(
    () => products.filter((product) => product.name.includes(query)),
    [products, query],
  );
  return <Table rows={visible} />;
}
```

- On the first render React calls the function and stores the result.
- On later renders React compares each dependency with `Object.is`. If none changed, it returns the cached value without calling the function.
- If any changed, it calls the function again and caches the new result.

## Two reasons to use it

**1. Skip expensive work.** Sorting or filtering thousands of rows, building a chart dataset, parsing a large document. A useful rule of thumb: wrap the code in `console.time`/`console.timeEnd`; if it consistently takes around 1 ms or more, memoizing is worth considering.

**2. Keep a stable reference.** Objects and arrays created during render are new every time. That breaks:

- `memo` children: `<Chart stats={stats} />` re-renders when `stats` is a new object.
- Effect dependencies: `useEffect(() => {...}, [options])` re-runs whenever `options` is recreated.

```jsx
const stats = useMemo(() => summarize(orders), [orders]);
return <Chart stats={stats} />;
```

## Dependencies

List **every reactive value** read inside the function: props, state, context, and values derived from them. The `eslint-plugin-react-hooks` rule `exhaustive-deps` checks this for you. Missing a dependency returns a stale result; adding unnecessary ones only reduces cache hits.

Watch out for dependencies that are themselves recreated every render:

```jsx
const filters = { query, category };
const visible = useMemo(() => applyFilters(items, filters), [items, filters]);
```

`filters` changes on every render, so the memo is useless. Depend on the primitives (`query`, `category`) and build the object inside the function.

## Pitfalls

- **Memoizing cheap work.** `useMemo(() => a + b, [a, b])` costs more than it saves and adds noise.
- **Using it for correctness.** React may throw away the cache (for example, during Fast Refresh edits or future features). Your component must still produce the right output if the function runs every time.
- **Side effects inside.** The calculation must be pure, just like render. No fetching, no state updates.
- **Returning a function.** Use `useCallback(fn, deps)` instead of `useMemo(() => fn, deps)`; they are equivalent but `useCallback` reads better.

## When you might not need it

Before memoizing, check if the value can be avoided altogether: compute it in an event handler, move state down, or store less derived data. And profile first: React DevTools shows how long each component takes to render.

## Modern note: React Compiler

React Compiler (v1.0, stable since October 2025) analyzes your components at build time and inserts this caching automatically, at a finer granularity than hand-written `useMemo`. In a compiled codebase you mostly write plain calculations and let the compiler memoize them. `useMemo` remains useful as an explicit escape hatch, for example to control exactly when an effect dependency changes, and you will meet it in nearly every existing React codebase.
