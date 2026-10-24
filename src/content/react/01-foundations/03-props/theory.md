## Props pass data down

Components talk to each other through **props** (short for properties). A parent passes props like HTML attributes, and the child receives them as **one object**, the first argument of the function.

```jsx
function Avatar(props) {
  return <img src={props.imageUrl} alt={props.name} width={props.size} />;
}

<Avatar name="Ada Lovelace" imageUrl="/ada.png" size={64} />
```

Any JavaScript value can be a prop: strings, numbers, objects, arrays, functions and even JSX. Strings can be written with quotes; everything else goes in braces.

```jsx
<Card title="Stats" count={3} tags={['new', 'hot']} onClose={handleClose} style={{ padding: 8 }} />
```

## Destructuring and default values

You almost always **destructure** props in the parameter list. It documents the API of the component at a glance:

```jsx
function Avatar({ name, imageUrl, size = 64 }) {
  return <img src={imageUrl} alt={name} width={size} height={size} />;
}
```

`size = 64` is a regular JavaScript default parameter. It applies when the prop is **missing or `undefined`**, but not when it is `null` or `0`.

## Legacy vs modern: defaultProps

Older code set defaults with a static property:

```jsx
function Avatar({ size }) { /* ... */ }
Avatar.defaultProps = { size: 64 };
```

`defaultProps` on function components was deprecated in React 18.3 and **removed in React 19**: elements created by the modern JSX transform ignore it (only the legacy `React.createElement` path still copies the values). Use destructuring defaults. Class components still support `static defaultProps`.

## Forwarding props

The spread syntax forwards every prop to a child. Combine it with rest destructuring to pick a few props and pass the rest along:

```jsx
function Profile({ role, ...person }) {
  return (
    <article>
      <Avatar {...person} size={96} />
      <p>{role}</p>
    </article>
  );
}
```

Use spreading sparingly: it hides which props a component actually needs.

## Props are read-only

A component must never change its own props. Treat them as an immutable snapshot of the parent's data at render time:

```jsx
function Price({ amount }) {
  amount = amount * 1.2; // 🔴 don't reassign or mutate props
  return <span>{amount}</span>;
}
```

Compute derived values in a new variable instead (`const withTax = amount * 1.2`). When a component needs to *change* something over time, it uses **state**, covered in the next module. When the parent passes new props, React re-renders the child with the new object.

## Pitfalls

- `<Avatar size="64" />` passes the **string** `"64"`. Use `size={64}` for a number.
- Boolean shorthand: `<Button disabled />` is the same as `disabled={true}`.
- `key` and `ref` look like props but are handled specially. `key` is never passed to your component; since React 19 `ref` *is* passed as a regular prop to function components.
- Destructuring a prop that is not passed gives `undefined`. Provide a default when it is optional.

## TypeScript preview

In `.tsx` files you describe props with a type, which you will practise in the TypeScript module:

```tsx
type AvatarProps = { name: string; imageUrl: string; size?: number };
function Avatar({ name, imageUrl, size = 64 }: AvatarProps) { /* ... */ }
```
