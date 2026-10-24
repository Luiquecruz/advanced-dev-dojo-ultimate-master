Style two small components without a CSS framework. Both are **named exports** of `App.jsx`.

### `Button`

Props: `variant` (`'primary'` default or `'secondary'`), `size` (`'sm'`, `'md'` default, `'lg'`), `fullWidth` (boolean, default `false`), `className`, plus any other prop.

- Render a `<button>` whose classes are: `btn`, `btn-<variant>`, `btn-<size>`, and `btn-block` **only** when `fullWidth` is true.
- Append the caller's `className` to the list.
- Forward every other prop (`onClick`, `type`, `disabled`...) to the `<button>`, and render `children`.
- Build the class list with `clsx`.

### `ProgressBar`

Prop: `value` (a number).

- Render an outer `<div role="progressbar">` with class `progress`, `aria-valuemin={0}`, `aria-valuemax={100}` and `aria-valuenow` set to the **clamped** value.
- Inside, render a `<div>` with class `progress-fill` and an **inline style** `width: <clamped value>%`.
- Clamp the value between `0` and `100` (`150` becomes `100`, `-5` becomes `0`).
