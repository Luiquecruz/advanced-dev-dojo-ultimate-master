Build an accessible `Tabs` compound component that shares state through **context**.

- **`export function Tabs({ defaultValue, onChange, children })`** stores the selected value (starting at `defaultValue`), provides it through a context and renders `<div>{children}</div>`. When the selection changes, call the optional `onChange(value)`.
- **`Tabs.List`** renders `<div role="tablist">` and forwards its other props (for example `aria-label`).
- **`Tabs.Tab`** (`{ value, children }`) renders `<button role="tab">` with `aria-selected` `true`/`false` and selects its `value` on click.
- **`Tabs.Panel`** (`{ value, children }`) renders `<div role="tabpanel">` only when its `value` is selected (otherwise nothing).
- `Tabs.Tab` and `Tabs.Panel` must work at **any nesting depth** inside `Tabs` (no `cloneElement`), and must throw an error whose message contains **`must be used inside <Tabs>`** when rendered outside it.

The default export `App` already uses the API.
