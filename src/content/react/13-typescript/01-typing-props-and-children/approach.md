1. Import `ReactNode` as a type from `react`.
2. Declare `CardProps` with the five members; make `subtitle`, `variant` and `onClose` optional.
3. Restrict `variant` with a string literal union.
4. Replace `any` with `CardProps` on the destructured parameter and default `variant` to `'info'`.
5. Render `data-variant`, the `<h3>`, the optional `<p>`, the children and the optional `Close` button.
6. Hover over the props in an editor: each one now has a precise type, and wrong usages like `variant="error"` would fail type checking.
