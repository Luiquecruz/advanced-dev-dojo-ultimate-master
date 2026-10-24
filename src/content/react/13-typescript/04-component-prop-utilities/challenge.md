Build a few design-system components on top of React's prop utilities.

1. **`export type ButtonProps = ComponentProps<'button'> & { variant?: 'primary' | 'ghost' }`** (you may use `ComponentPropsWithRef`).
   **`export function Button`** renders a `<button>` that accepts every native prop (spread the rest), defaults `type` to **`'button'`** and `variant` to **`'primary'`**, and sets `className` to `btn btn-{variant}` followed by the caller's `className` when present (for example `btn btn-ghost wide`). A `ref` passed to `Button` must reach the `<button>`.
2. **`export type IconButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & { icon: string; label: string }`**.
   **`export function IconButton`** renders a `Button` with `aria-label={label}`, the `icon` as its only child, and every other prop passed through.
3. **`export function Panel({ title, children }: PropsWithChildren<{ title: string }>)`** renders a `<section>` with an `<h2>` title and the children.
4. **`export type AlertProps`** is a discriminated union: `{ message: string }` combined with either `{ dismissible: true; onDismiss: () => void }` or `{ dismissible?: false; onDismiss?: never }`.
   **`export function Alert(props: AlertProps)`** renders `<div role="alert">` with the message and, only when `dismissible` is `true`, a `<button>` **`Dismiss`** calling `onDismiss`.
