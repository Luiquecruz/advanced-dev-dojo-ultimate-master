1. Recognize the flicker: the first paint uses the default placement, then the passive Effect measures and causes a second paint.
2. Measuring layout and adjusting the UI synchronously is exactly what `useLayoutEffect` is for.
3. Swap `useEffect` for `useLayoutEffect`, keeping the same body and dependencies.
4. React now runs the measurement right after committing the DOM, processes `setPlacement` synchronously, and the browser only paints the final placement.
5. The Profiler shows `mount` followed by `nested-update` instead of `update`, confirming the correction happened inside the commit.
