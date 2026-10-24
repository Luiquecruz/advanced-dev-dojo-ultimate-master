1. Map each state variable to its readers: `query` and `selectedId` are read only by the search section; `accent` by the frame and its select.
2. Move state down: extract `SearchPanel`, the closest common parent of the search components, so only that subtree re-renders on typing or selecting.
3. Lift content up: the frame needs to wrap the chart, so extract `AccentFrame` with a `children` prop. The chart element is created by `Dashboard`, which no longer re-renders, so React reuses it.
4. `Dashboard` becomes stateless composition. Verify with the render counter instead of adding `memo`.
