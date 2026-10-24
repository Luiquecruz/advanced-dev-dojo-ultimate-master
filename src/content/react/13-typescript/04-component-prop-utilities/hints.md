Reuse the DOM's types: `export type ButtonProps = ComponentProps<'button'> & { variant?: 'primary' | 'ghost' };`. Destructure what you handle (`variant`, `type`, `className`) and collect the rest with `...rest`.
---
Build the class list without empty entries: `['btn', \`btn-${variant}\`, className].filter(Boolean).join(' ')`. Spreading `{...rest}` on the `<button>` also forwards `ref`, because React 19 passes it as a regular prop.
---
`IconButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & { icon: string; label: string }`. For the alert: `{ message: string } & ({ dismissible: true; onDismiss: () => void } | { dismissible?: false; onDismiss?: never })`, and check `props.dismissible` before using `props.onDismiss`.
