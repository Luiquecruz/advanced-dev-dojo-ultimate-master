## Refs across component boundaries

A parent sometimes needs to **command** a child: focus an input, scroll a list, play a video, open a dialog. In React 19 a function component receives `ref` as a regular prop, so the parent can pass a ref down and the child can attach it to a DOM node:

```jsx
function TextField({ ref, label }) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  );
}

function Form() {
  const fieldRef = useRef(null);
  return (
    <>
      <TextField ref={fieldRef} label="Name" />
      <button onClick={() => fieldRef.current.focus()}>Edit</button>
    </>
  );
}
```

This works, but it hands the parent the **whole DOM node**. The parent can now change styles, remove children or read internals, coupling it to the child's markup.

## Exposing a custom handle

`useImperativeHandle(ref, createHandle, dependencies?)` replaces what the parent receives in `ref.current` with an object **you** design:

```jsx
import { useImperativeHandle, useRef } from 'react';

function TextField({ ref, label }) {
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus() {
      inputRef.current.focus();
    },
    clear() {
      inputRef.current.value = '';
    },
  }), []);

  return (
    <label>
      {label}
      <input ref={inputRef} />
    </label>
  );
}
```

- The child keeps the real DOM node in a **private** ref.
- The parent's `ref.current` is `{ focus, clear }` and nothing else.
- `createHandle` re-runs when dependencies change. Without a dependency array it re-runs on every render.
- The handle can expose methods of several nodes (`scrollToTop()` + `focusSearch()`), or methods of a third-party instance (a map or editor).

## Use it sparingly

Imperative handles are an **escape hatch** for actions that cannot be expressed as props:

| Good fit (imperative) | Better as props (declarative) |
| --- | --- |
| `focus()`, `select()`, `scrollIntoView()` | `isOpen` for a modal |
| `play()` / `pause()` on media | `value` of an input |
| triggering an animation once | `variant="error"` |

If the parent wants to show or hide something, pass a prop. `<Modal isOpen={open} />` is easier to reason about and test than `modalRef.current.open()`.

## TypeScript

Type the handle explicitly and use it in both places:

```tsx
export type TextFieldHandle = { focus(): void; clear(): void };

function TextField({ ref }: { ref?: React.Ref<TextFieldHandle> }) { ... }

const fieldRef = useRef<TextFieldHandle>(null);
```

## Legacy vs modern

Before React 19, function components could not receive `ref` as a prop. You had to wrap them in `forwardRef`:

```jsx
const TextField = forwardRef(function TextField(props, ref) {
  useImperativeHandle(ref, () => ({ focus() {} }), []);
  return <input />;
});
```

`forwardRef` still works in React 19 but is no longer needed and will be deprecated; a codemod converts it to the `ref` prop. Class components exposed their **instance** to parents automatically, so any public method (`this.focus()`) was callable through a ref; `useImperativeHandle` makes that surface explicit and minimal.
