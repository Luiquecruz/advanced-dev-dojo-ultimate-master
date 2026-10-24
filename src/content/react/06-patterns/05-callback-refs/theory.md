## A ref can be a function

Besides ref objects (`useRef`, `createRef`), the `ref` attribute accepts a **function**. React calls it with the DOM node right after the node is attached, so you can act on the node at exactly the right moment:

```jsx
function SearchField() {
  return <input ref={(node) => node?.focus()} />;
}
```

Callback refs shine when:

- the element appears **conditionally** or later than its parent mounts,
- you render a **dynamic list** and need one node per item (you cannot call `useRef` in a loop),
- you need to run setup and cleanup **per node** (observers, third-party widgets, listeners).

## React 19: cleanup functions

React 19 lets a ref callback **return a cleanup function**, just like an effect. React calls it when the node is detached or when the callback changes:

```jsx
<div
  ref={(node) => {
    const observer = new ResizeObserver(() => measure(node));
    observer.observe(node);
    return () => observer.disconnect();
  }}
/>
```

### Legacy behavior (still supported)

Before React 19, React called the callback a second time with **`null`** on detach, and you had to branch on it:

```jsx
ref={(node) => {
  if (node) {
    map.set(id, node);
  } else {
    map.delete(id);
  }
}}
```

If your callback returns a cleanup, React 19 no longer calls it with `null`. Note that the arrow-function shorthand `ref={(node) => (this.input = node)}` now **returns** a value; TypeScript rejects that, and the codemod rewrites it to a block body `ref={(node) => { this.input = node; }}`.

## When does the callback run?

A new function on every render (an inline arrow) means a **different** callback each time, so React runs the previous cleanup and calls the new callback after every commit. Usually harmless, but for expensive setup memoize it:

```jsx
const measuredRef = useCallback((node) => {
  setHeight(node.getBoundingClientRect().height);
}, []);
```

In StrictMode, React 19 runs ref callbacks setup → cleanup → setup on mount, exactly like effects, to prove your cleanup works.

## Refs for a list of items

You cannot call `useRef` inside a `map` (Rules of Hooks). Keep one `Map` in a ref and register each node with a callback ref:

```jsx
function Gallery({ cats }) {
  const nodesRef = useRef(new Map());

  return (
    <ul>
      {cats.map((cat) => (
        <li
          key={cat.id}
          ref={(node) => {
            nodesRef.current.set(cat.id, node);
            return () => nodesRef.current.delete(cat.id);
          }}
        >
          {cat.name}
        </li>
      ))}
    </ul>
  );
}

nodesRef.current.get(id).scrollIntoView();
```

The cleanup keeps the map in sync when items are removed, avoiding leaks and references to detached nodes.

## Callback refs vs effects

`useEffect` with a ref object runs after **the component** commits and only re-runs when its dependencies change. If the node appears later (a conditional child that mounts on a toggle) or is swapped for another node, the effect does not know. A callback ref is tied to **the node itself**, so it never misses one.

| | Ref object + effect | Callback ref |
| --- | --- | --- |
| Runs when | component commits / deps change | node attached, detached or callback changes |
| Dynamic lists | awkward | natural |
| Cleanup | effect cleanup | returned function (React 19) or `null` call |

## Legacy notes

- String refs (`ref="input"`) were removed in React 19.
- Class components commonly used `ref={(el) => { this.input = el; }}` before `createRef` existed (React 16.3).

## Pitfalls

- Calling `setState` unconditionally in an inline callback ref re-renders, creates a new callback, calls it again... an infinite loop. Memoize with `useCallback` or guard the update.
- Forgetting that pre-19 style callbacks receive `null`: `ref={(node) => node.focus()}` crashes on unmount unless you use `node?.focus()` or return a cleanup.
