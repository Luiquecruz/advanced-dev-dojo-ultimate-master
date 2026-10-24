## Three steps: trigger, render, commit

Every screen update in React goes through the same pipeline:

1. **Trigger.** Something asks for an update: the initial `root.render(<App />)`, a state setter (`setCount`), a `useReducer` dispatch, a context value change, or an external store notification.
2. **Render.** React *calls your components* to find out what the UI should look like. A component that returned `<button>Clicks: 3</button>` last time and `<button>Clicks: 4</button>` now produces a new tree of React elements. Nothing touches the DOM in this phase.
3. **Commit.** React compares the new tree with the previous one and applies the **minimal set of DOM mutations**. Then it runs layout effects, lets the browser paint, and finally runs passive effects (`useEffect`).

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  console.log('render', count);
  return <button onClick={() => setCount(count + 1)}>Clicks: {count}</button>;
}
```

Clicking logs `render 1`, but React only updates one text node in the DOM. **"Rendering" means calling your function, not repainting the page.**

### Rendering is recursive

When a component renders, React renders **all of its children too**, by default, whether or not their props changed. That is usually fast. Memoization (`memo`, `useMemo`, `useCallback`, or React Compiler) is how you skip subtrees that you know did not change.

### Batching

Since React 18, all state updates in the same event, timeout or promise callback are **batched** into a single render:

```jsx
function handleClick() {
  setName('Ada');
  setAge(36);
}
```

One render, one commit. Use `flushSync` only in the rare case you must read the DOM between two updates.

## Fiber: the work loop

Internally, every component instance is represented by a **fiber**, a plain object that stores its type, key, props, state (the hook list), and pointers to its parent, first child and next sibling. React keeps two fiber trees: the **current** tree on screen and the **work-in-progress** tree being rendered.

Because the render phase is just walking fibers, React can **pause, resume, or throw away** that work. This is what makes concurrent features possible: a transition render can be interrupted when the user types, and Suspense can show a fallback while waiting for data. The commit phase, in contrast, is always synchronous so the user never sees a half-updated DOM.

## Reconciliation: how React diffs

Comparing two arbitrary trees is expensive (O(n³)). React uses two heuristics to make it O(n):

1. **Different type means a different tree.** If a `<div>` becomes a `<section>`, or `<Counter>` becomes `<Timer>`, React destroys the old subtree (including its state and DOM) and mounts a new one.
2. **Keys identify children in a list.** Among siblings, React matches old and new elements by `key`. Without keys it matches by position.

```jsx
{isEditing ? <input key="edit" /> : <input key="view" />}
```

Same type, different key: React treats them as different components, so the input is remounted and its state is reset.

### State lives in the tree position

State is tied to a **position in the tree**, not to the component function. If the same component renders at the same position with the same key, it keeps its state:

```jsx
{showA ? <Counter label="A" /> : <Counter label="B" />}
```

Toggling keeps the count, because both branches render `<Counter>` at the same position. Give them different keys (`key="A"` / `key="B"`) to reset it.

## Pitfalls

- **Index as key** in lists that reorder or filter. State (an input value, a checkbox) sticks to the position and appears to jump between rows.
- **Defining components inside components.** `function Parent() { function Row() {...} }` creates a *new type* every render, so `Row` remounts and loses its state each time. Declare components at the top level.
- **Impure render.** Since React may render a component more than once (Strict Mode, interrupted transitions), the render body must not mutate external variables, start requests or touch the DOM. Do that in event handlers or effects.
- **Random keys** (`key={Math.random()}`) remount every child on every render.

## Legacy vs modern

Before React 16 the "stack reconciler" walked the tree recursively and could not be interrupted. Fiber (React 16) rewrote the core as an interruptible loop, and React 18 turned on concurrent rendering through `createRoot`. The legacy `ReactDOM.render` API (removed in React 19) always rendered synchronously.
