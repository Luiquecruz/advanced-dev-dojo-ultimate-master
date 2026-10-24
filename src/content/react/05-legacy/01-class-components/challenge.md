Build a `Counter` **class component** (no hooks).

- `export default class Counter extends Component` (import `Component` from `react`).
- `static defaultProps = { label: 'Count', step: 1 }`.
- Initial state: `{ count: 0 }`.
- Render a `<p>` with the text `{label}: {count}`, for example `Count: 0`.
- A button **`Increment`** adds `step` to the count.
- A button **`Increment twice`** calls `setState` **twice in the same handler**, each adding `step`. The count must grow by `2 × step`, so use the updater form.
- A button **`Reset`** sets the count back to `0`.

Bind the handlers correctly (class field arrows or `bind` in the constructor) so `this` works when React calls them.
