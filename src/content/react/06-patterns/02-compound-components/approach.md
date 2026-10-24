1. Implement `useTabs`: read the context and throw the documented error when it is `null`.
2. In `Tabs`, own the selected value with `useState(defaultValue)` and expose `{ value, select }` through the context provider.
3. `TabList` adds `role="tablist"` and spreads the remaining props so `aria-label` reaches the DOM.
4. `Tab` compares its `value` with the context value to compute `aria-selected` and calls `select` on click.
5. `TabPanel` renders only when selected.
6. Because every part reads context, they work however deeply the caller nests them.
