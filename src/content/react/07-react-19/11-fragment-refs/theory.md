## Refs for a group of elements

Sometimes you need to act on **several sibling elements** a component renders: listen to clicks on all of them, focus the first focusable one, observe whether any is visible. Until React 19.3 you had two bad options:

1. **Add a wrapper `<div>`** and put the ref on it. The extra node breaks CSS (flex and grid layouts, `:first-child`, table structure) and accessibility (a `<div>` inside a `role="toolbar"` or `<ul>`).
2. **Collect a ref per child**, which only works if every child forwards its ref, and fails for third-party components.

## `<Fragment ref>`

React 19.3 made Fragment refs stable. A `ref` on `<Fragment>` receives a **`FragmentInstance`**: an object that operates on the DOM children of the Fragment as a group, without adding any node.

```jsx
import { Fragment, useEffect, useRef } from 'react';

function ClickTracker({ onClick, children }) {
  const fragmentRef = useRef(null);

  useEffect(() => {
    const fragment = fragmentRef.current;
    fragment.addEventListener('click', onClick);
    return () => fragment.removeEventListener('click', onClick);
  }, [onClick]);

  return <Fragment ref={fragmentRef}>{children}</Fragment>;
}
```

The short `<>...</>` syntax cannot take props, so write `<Fragment ref={...}>`.

## FragmentInstance methods

| Group | Methods | Applies to |
| --- | --- | --- |
| Events | `addEventListener`, `removeEventListener`, `dispatchEvent` | first-level host children |
| Focus | `focus`, `focusLast`, `blur` | nested children, depth-first |
| Observers | `observeUsing(observer)`, `unobserveUsing(observer)` | first-level children, for `IntersectionObserver` and `ResizeObserver` |
| Layout | `getClientRects`, `getRootNode`, `compareDocumentPosition`, `scrollIntoView` | first-level children |

"First-level host children" means the nearest DOM elements, even if they are rendered by nested components. Listeners are also attached to children that **appear later**: React keeps the group in sync when children mount and unmount.

### Visibility without a wrapper

```jsx
function InView({ onChange, children }) {
  const fragmentRef = useRef(null);

  useLayoutEffect(() => {
    const visible = new Set();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target)));
      onChange(visible.size > 0);
    });
    const fragment = fragmentRef.current;
    fragment.observeUsing(observer);
    return () => fragment.unobserveUsing(observer);
  }, [onChange]);

  return <Fragment ref={fragmentRef}>{children}</Fragment>;
}
```

### Focus management

`fragmentRef.current.focus()` moves focus to the **first focusable** descendant: handy for dialogs, toolbars and "skip to content" features without querying the DOM.

## Pitfalls

- **Clean up listeners.** Like `addEventListener` on `window`, every listener added in an effect must be removed in its cleanup, with the same function and options. Otherwise re-renders with a new callback stack up duplicate listeners.
- `event.currentTarget` is the child element the listener ran on, not the Fragment.
- Fragment refs are DOM-specific (`react-dom`); other renderers may not support every method.
- Prefer regular element refs when you control a single element; Fragment refs shine for groups and for children you don't own.
