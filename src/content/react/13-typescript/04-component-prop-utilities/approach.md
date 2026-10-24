1. Define `ButtonProps` by intersecting `ComponentProps<'button'>` with the custom `variant` prop.
2. In `Button`, default `type` and `variant`, merge `className`, and spread the remaining native props (including `ref`).
3. Derive `IconButtonProps` from `Button` itself with `ComponentProps<typeof Button>`, removing `children` with `Omit`, and add `icon` and `label`.
4. Render `IconButton` as a `Button` with `aria-label` and the icon child, passing the rest through.
5. Type `Panel` with `PropsWithChildren<{ title: string }>`.
6. Model `AlertProps` as a union of the two valid shapes, then narrow on `props.dismissible` to render the button.
