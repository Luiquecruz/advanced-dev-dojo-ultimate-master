## Three small APIs that remove a lot of ceremony

React 19 simplified three things almost every component library touches: passing refs, providing context and cleaning up ref callbacks.

## 1. `ref` is a regular prop

Before React 19, function components could not receive `ref`: React stripped it from props. You needed `forwardRef`:

```jsx
// Old way
const TextInput = forwardRef(function TextInput({ label }, ref) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  );
});
```

Now `ref` arrives in props like anything else:

```jsx
// New way
function TextInput({ label, ref }) {
  return (
    <label>
      {label}
      <input ref={ref} />
    </label>
  );
}

function SearchPanel() {
  const inputRef = useRef(null);
  return (
    <>
      <TextInput label="Search" ref={inputRef} />
      <button onClick={() => inputRef.current.focus()}>Focus</button>
    </>
  );
}
```

`forwardRef` still works but is no longer needed and will be deprecated; a codemod migrates it. Class components are different: there `ref` still points to the class instance and is not passed as a prop.

## 2. `<Context>` is the provider

```jsx
const ThemeContext = createContext('light');

// Old way
<ThemeContext.Provider value="dark">
  <Page />
</ThemeContext.Provider>

// New way
<ThemeContext value="dark">
  <Page />
</ThemeContext>
```

Consumers do not change: `useContext(ThemeContext)` or `use(ThemeContext)`. `Context.Provider` is planned for deprecation. Since React 19.3, Server Components can also render `<ThemeContext value={...}>` directly when the context is imported from a `'use client'` module, without a wrapper Provider component.

## 3. Ref callbacks can return a cleanup

A ref callback runs when the element attaches. Previously React called it again with `null` on detach, so every callback needed a null check:

```jsx
// Old way
<div
  ref={(node) => {
    if (node) {
      observer.observe(node);
    } else {
      observer.disconnect();
    }
  }}
/>
```

In React 19 a ref callback may **return a cleanup function**, exactly like an effect:

```jsx
// New way
<div
  ref={(node) => {
    observer.observe(node);
    return () => observer.unobserve(node);
  }}
/>
```

When a cleanup is returned, React no longer calls the callback with `null`. Pitfall: with implicit returns, `ref={(node) => (instance = node)}` now *returns* the node, which TypeScript rejects. Use a block body: `ref={(node) => { instance = node; }}`.

## Bonus: `useRef` requires an argument (TypeScript)

The React 19 types require `useRef(initialValue)`; `useRef()` without arguments is a type error, and every ref object is mutable (`MutableRefObject` was folded into `RefObject`).

## Summary

| Task | React 18 | React 19 |
| --- | --- | --- |
| Receive a ref in a function component | `forwardRef((props, ref) => ...)` | `function C({ ref })` |
| Provide context | `<Ctx.Provider value>` | `<Ctx value>` |
| Clean up a ref callback | check for `null` | return a cleanup function |
