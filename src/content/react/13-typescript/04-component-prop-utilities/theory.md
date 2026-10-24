## Do not retype the DOM

A design-system `Button` should accept everything a native `<button>` accepts: `onClick`, `disabled`, `type`, `form`, `aria-*`, `data-*`... Writing those by hand is endless and always incomplete. React's types already describe them, and a few utilities let you reuse them.

## ComponentProps

`ComponentProps<T>` extracts the props of an intrinsic element or a component:

```tsx
import type { ComponentProps } from 'react';

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'ghost';
};

function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  return <button className={`btn btn-${variant} ${className}`.trim()} {...rest} />;
}
```

`<Button disabled onClick={save} aria-describedby="hint">` is now fully typed, and `<Button href="/">` is an error because buttons have no `href`.

It also works with **your own components**, including third-party ones whose props type is not exported:

```tsx
type IconButtonProps = Omit<ComponentProps<typeof Button>, 'children'> & {
  icon: string;
  label: string;
};
```

## With or without ref

| Utility | Includes `ref`? |
| --- | --- |
| `ComponentProps<'input'>` | yes (React 19 types: `ref` is a regular prop) |
| `ComponentPropsWithRef<'input'>` | yes, explicitly |
| `ComponentPropsWithoutRef<'input'>` | no |

In React 19, a function component that spreads `...rest` from `ComponentProps<'button'>` onto the `<button>` forwards the `ref` automatically. Before React 19 you needed `forwardRef` plus `ComponentPropsWithoutRef` to avoid a type mismatch, which is why older design systems use that combination everywhere. Use `ComponentRef<typeof Button>` (formerly `ElementRef`) to get the ref's element type.

## PropsWithChildren

`PropsWithChildren<P>` is `P & { children?: ReactNode }`:

```tsx
function Panel({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
```

Convenient for layout components. Note that children become **optional**; declare `children: ReactNode` yourself when they are required.

## Omit, Pick and overriding native props

Use `Omit` to remove or **replace** a native prop whose type you want to change:

```tsx
type InputProps = Omit<ComponentProps<'input'>, 'size'> & {
  size?: 'sm' | 'md' | 'lg';
};
```

Without `Omit`, the intersection would make `size` `number & ('sm' | ...)`, which is `never`.

## Discriminated props: valid combinations only

Some props only make sense together. A boolean plus an optional callback allows nonsense like `dismissible` without `onDismiss`. A **union of prop shapes** makes invalid states unrepresentable:

```tsx
type AlertProps = { message: string } & (
  | { dismissible: true; onDismiss: () => void }
  | { dismissible?: false; onDismiss?: never }
);

function Alert(props: AlertProps) {
  return (
    <div role="alert">
      {props.message}
      {props.dismissible && <button onClick={props.onDismiss}>Dismiss</button>}
    </div>
  );
}
```

- `<Alert message="Saved" dismissible />` is an error: `onDismiss` is required.
- `<Alert message="Saved" onDismiss={close} />` is an error: `never` forbids it without `dismissible`.

Read the discriminant from `props` **before destructuring** the dependent members, otherwise TypeScript loses the link between them (TypeScript 4.6+ narrows destructured discriminated unions only when they are destructured from a `const` parameter together).

The same technique types polymorphic components: `{ as: 'a'; href: string } | { as?: 'button' }`.

## Legacy vs modern

- PropTypes had `PropTypes.oneOf` and custom validators to approximate "these props go together", only checked at runtime.
- `React.HTMLAttributes<HTMLButtonElement>` or `React.ButtonHTMLAttributes<HTMLButtonElement>` appear in older code. They work but miss `ref` and `key`; `ComponentProps<'button'>` is shorter and complete.
- `React.ElementRef` was deprecated in favor of `ComponentRef`.

## Pitfalls

- Spreading `...rest` **before** your own props lets callers override internal ones (`className`, `type`); spread after if callers should win, before if your values must win. Decide on purpose.
- Forgetting `type="button"` on a button inside a form submits the form. Default it.
- Unions of many props are hard to read: name each member (`type DismissibleAlertProps = ...`).
