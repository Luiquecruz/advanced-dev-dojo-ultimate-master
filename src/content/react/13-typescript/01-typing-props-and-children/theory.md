## Props are just a function parameter

A function component is a function that receives one object. Typing its props is typing that parameter:

```tsx
type AvatarProps = {
  name: string;
  imageUrl: string;
  size?: number;
};

function Avatar({ name, imageUrl, size = 64 }: AvatarProps) {
  return <img src={imageUrl} alt={name} width={size} height={size} />;
}
```

Now `<Avatar name="Ada" />` is a compile error (`imageUrl` is missing), and `size="64"` is rejected because it is a string. Your editor autocompletes every prop.

`type` or `interface`? Both work. Interfaces can be extended and merged; type aliases can express unions. Pick one convention per codebase.

## Optional props and defaults

Mark optional props with `?` and give them a destructuring default. Inside the component, TypeScript knows `size` is a `number` because the default removes `undefined`.

Union **literal types** turn "magic strings" into a checked list:

```tsx
type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'danger';
};
```

## Typing children

`children` is a prop like any other. The type you want almost always is **`ReactNode`**: everything React can render (elements, strings, numbers, arrays, fragments, `null`, `undefined`, booleans, portals).

```tsx
import type { ReactNode } from 'react';

type CardProps = {
  title: string;
  children: ReactNode;
};
```

- Use `children: ReactNode` when content is required, `children?: ReactNode` when optional.
- `ReactElement` (or `JSX.Element`) is narrower: exactly one element, no strings or `null`. Use it only when you really need an element, for example to clone it.
- Render props: `children: (value: number) => ReactNode`.

`PropsWithChildren<P>` adds an **optional** `children?: ReactNode` to `P`. It is handy but hides whether children are required; you will see it again in the prop utilities lesson.

## Callback props

Describe callbacks with function types. Name them `onSomething`, and pass data rather than events when the parent does not need the DOM event:

```tsx
type TodoItemProps = {
  title: string;
  onToggle: (id: number) => void;
  onClose?: () => void;
};
```

Return `void` for callbacks whose result you ignore: parents may then pass functions that return something.

## Legacy vs modern

**PropTypes** (runtime checks) were the JavaScript way to document props:

```jsx
Avatar.propTypes = { name: PropTypes.string.isRequired };
```

React 19 ignores `propTypes`. TypeScript checks at compile time, with zero runtime cost, and powers autocompletion.

**`React.FC`** was popular in early TypeScript + React code:

```tsx
const Avatar: React.FC<AvatarProps> = ({ name }) => <span>{name}</span>;
```

Before React 18's types it implicitly added `children` to every component (a common source of bugs) and it did not work well with generics or `defaultProps`. The community moved to **plain functions with annotated props**, which is what react.dev and the React TypeScript Cheatsheet recommend. `React.FC` still exists and no longer adds `children`, so you can read it without worry.

## Inferring the return type

Do not annotate the return type as `JSX.Element`: TypeScript infers it, and an explicit annotation breaks when you `return null` or a string. Since TypeScript 5.1 and React 18 types, components may return any `ReactNode`.

## Pitfalls

- `props: any` silences every check, including typos in prop names. Prefer `unknown` plus narrowing if you truly do not know the shape.
- `children: JSX.Element` rejects `"text"` and `{list.map(...)}` arrays. Use `ReactNode`.
- `{count && <Badge />}` with `count: number` renders `0`. Types do not prevent that bug: use `count > 0 &&`.
- This platform transpiles TypeScript without type checking in the React track, so tests check behavior plus your type declarations in the source. In a real project, run `tsc --noEmit` (or rely on your editor) to catch errors.
