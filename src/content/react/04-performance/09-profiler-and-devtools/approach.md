1. Import `Profiler` from `react` and wrap `Sidebar` and `Feed` in separate profilers with ids `Sidebar` and `Feed`, both using the `onRender` prop.
2. On mount, each profiler commits once, so `onRender` is called with phase `mount` for both ids.
3. Clicking Like updates state inside `Feed` only. React re-renders just that subtree, so only the `Feed` profiler reports an `update`.
4. In `createRenderLog`, make `onRender` push an object with `id`, `phase` and `actualDuration`, ignoring the remaining arguments.
5. Build `summary` by folding the entries into a per-id counter object, mapping `nested-update` to the update bucket.
