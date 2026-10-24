## Ship less JavaScript up front

Bundlers put every statically imported module into the bundle the browser downloads before your app starts. A charting library used on one page still slows down every page. **Code splitting** moves rarely used code into separate chunks that load on demand.

The building block is the standard dynamic `import()`, which returns a Promise of a module. Vite, webpack, Rollup and esbuild all turn it into a separate chunk.

## `lazy` turns a dynamic import into a component

```jsx
import { lazy, Suspense } from 'react';

const Chart = lazy(() => import('./Chart'));

function Reports() {
  return (
    <Suspense fallback={<p>Loading chart...</p>}>
      <Chart />
    </Suspense>
  );
}
```

- `lazy(load)` receives a function returning a Promise of a module whose **default export** is a component.
- Call `lazy` at the **module top level**. Calling it inside a component creates a new component type on every render, which resets state and reloads.
- The first time `<Chart />` renders, React calls `load()`. While the Promise is pending, the component **suspends**.

## Suspense shows a fallback

`<Suspense fallback={...}>` catches suspending children below it and renders the fallback until all of them are ready. One boundary can cover several lazy components, and boundaries can be nested to reveal content progressively:

```jsx
<Suspense fallback={<PageSkeleton />}>
  <Header />
  <Suspense fallback={<ChartSkeleton />}>
    <Chart />
  </Suspense>
</Suspense>
```

Suspense is not only for code. The same boundary handles data read with `use(promise)` and Suspense-enabled libraries (TanStack Query's `useSuspenseQuery`, framework loaders).

## Named exports

`lazy` expects a default export. For a named export, map it:

```jsx
const Chart = lazy(() => import('./charts').then((module) => ({ default: module.SalesChart })));
```

## Where to split

- **Routes**: the most natural boundary. Routers (React Router `lazy`, Next.js, TanStack Router) do it per route for you.
- **Heavy, conditional UI**: modals, editors, charts, maps, admin panels.
- Not tiny components: each chunk costs a network round trip.

Load a chunk **before** it is needed to hide latency: call the same `import('./Chart')` on hover or when the browser is idle. Module loading is cached, so the later `lazy` call resolves instantly.

## Pitfalls

- A fallback that replaces visible content feels jumpy. Wrap navigation updates in `startTransition` so React keeps the current screen while the next chunk loads.
- A failed chunk download (offline, new deploy) rejects the Promise. Put an **error boundary** around lazy content to show a retry message.
- Do not place the boundary too high: a fallback at the root hides the whole app.

## React 19 behavior

React 19 **commits the fallback immediately** when a component suspends, then "pre-warms" the rest of the siblings in the background. Earlier versions kept rendering siblings first, which delayed the fallback.

## Legacy vs modern

Before `React.lazy` (16.6), code splitting used libraries like `react-loadable` or `@loadable/component`, which wrapped imports in higher-order components with their own `loading` prop. Server rendering of lazy components only became possible with the streaming renderer in React 18; `@loadable/component` is still met in older SSR codebases.
