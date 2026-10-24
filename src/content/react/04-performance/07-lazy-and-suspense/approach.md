1. Delete `import Chart from './Chart'`: a static import always lands in the main bundle.
2. Import `lazy` and `Suspense` from `react`.
3. Declare `const Chart = lazy(() => import('./Chart'))` outside the component so the lazy type is created once.
4. Wrap `<Chart />` in a `Suspense` boundary with the `Loading chart...` fallback. The first render of `Chart` suspends while the module Promise is pending.
5. When the Promise resolves, React retries the boundary and renders the chart in place of the fallback.
