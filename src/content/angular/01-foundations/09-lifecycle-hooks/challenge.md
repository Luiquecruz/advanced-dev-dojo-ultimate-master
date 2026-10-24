Complete the `AutoRefresh` component in `app.ts` (selector `app-auto-refresh`). It has two inputs, `label` (default `'Feed'`) and `intervalMs` (default `1000`), and two signals, `ticks` and `changes`. Implement its lifecycle:

1. **`ngOnInit`**: start a `setInterval` that adds `1` to `ticks` every `intervalMs()` milliseconds. (It must use the input value bound by the parent, which is why it can't live in the constructor.)
2. **Cleanup**: stop the interval when the component is destroyed, with `ngOnDestroy` or `DestroyRef.onDestroy`.
3. **`ngOnChanges`**: when `label` changes **after the first binding**, append the text `label: <previous> → <current>` (e.g. `label: Feed → News`) to `changes`. Ignore the first change.
4. **`afterNextRender`**: in the constructor, register a callback that focuses the `<input aria-label="Filter">` after the first render.

The template (label, ticks, filter input and change list) is already written.
