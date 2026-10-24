The reports page imports a heavy `Chart` component statically, so its code is downloaded even when nobody opens it. Split it out.

In `App.jsx`:

- Remove the static `import Chart from './Chart'`.
- Create `const Chart = lazy(() => import('./Chart'))` at the module top level.
- Wrap `<Chart />` in `<Suspense fallback={<p>Loading chart...</p>}>`.

Behavior:

- Initially only the `Reports` heading (`<h2>`) and the **Show chart** button are visible.
- Clicking **Show chart** immediately shows `Loading chart...`.
- Once the module loads, the `Sales chart` heading and its three list items are rendered.

`Chart.jsx` is already done; do not change it.

> In this sandbox all files are already in memory, so the "download" is instant, but React still suspends on the first render exactly like it would over the network.
