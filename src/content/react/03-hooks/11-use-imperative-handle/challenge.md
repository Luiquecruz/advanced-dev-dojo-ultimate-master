`SearchInput` passes the parent's `ref` straight to its `<input>`, leaking the whole DOM node. `App` also expects a `clear()` method that does not exist.

Rewrite `SearchInput({ ref, label = 'Search' })` (named export) so that:

- It keeps the `<input>` in its own private ref (`useRef`).
- With `useImperativeHandle`, the parent's `ref.current` becomes an object with exactly two methods:
  - `focus()`: focuses the input.
  - `clear()`: empties the input's value.
- It still renders `<label>{label}<input /></label>`, so the input is found by its label text.

`App` (default export) already renders a `SearchInput` plus **Focus search** and **Clear** buttons that call the handle. Use the React 19 `ref` prop, no `forwardRef`.
