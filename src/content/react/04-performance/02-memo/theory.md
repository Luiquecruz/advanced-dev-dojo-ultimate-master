## Skipping renders with `memo`

When a component renders, React renders all of its children again. Usually that is cheap. When a child is expensive (a big list, a chart) and its props did not change, you can tell React to reuse the previous result:

```jsx
import { memo } from 'react';

const UserList = memo(function UserList({ users }) {
  return <ul>{users.map((user) => <li key={user.id}>{user.name}</li>)}</ul>;
});
```

Before calling a memoized component, React compares each new prop with the previous one using `Object.is`. If **all** props are equal, it skips the component and its whole subtree.

`memo` only looks at **props**. A memoized component still re-renders when its own state changes or when a context it reads changes.

## The reference trap

`Object.is` compares objects, arrays and functions **by reference**:

```jsx
function Dashboard({ users }) {
  const [clicks, setClicks] = useState(0);
  return (
    <>
      <button onClick={() => setClicks(clicks + 1)}>Clicks: {clicks}</button>
      <UserList users={users} options={{ showEmail: true }} onSelect={(user) => alert(user.name)} />
    </>
  );
}
```

Both `options` and `onSelect` are created fresh on every render of `Dashboard`, so `memo` sees "changed" props every time and never skips. Fixes, from simplest to most flexible:

| Prop | Fix |
| --- | --- |
| Constant object/array | Hoist it outside the component: `const OPTIONS = { showEmail: true };` |
| Object derived from props/state | `useMemo(() => ({ ... }), [deps])` |
| Callback | `useCallback(fn, [deps])` or a stable function such as a `dispatch` |
| Many primitive values | Pass primitives (`showEmail={true}`) instead of wrapping them in an object |

## Custom comparison

`memo` accepts a second argument:

```jsx
const Chart = memo(ChartImpl, (prev, next) => prev.data.version === next.data.version);
```

Return `true` to **skip** the render. Be careful: if you ignore a prop (a callback, for example), the component keeps using a stale value. Prefer making props stable over writing comparators.

## Other ways to avoid re-renders

Memoization is not the first tool to reach for. Often you can restructure instead:

- **Move state down.** If only the button needs `clicks`, put the button and its state in its own component. The list is no longer a child of the component that changes.
- **Lift content up as `children`.** `<Layout><ExpensiveTree /></Layout>`: when `Layout`'s state changes, `children` is the same element reference, so React skips it automatically.

## When to use `memo`

- The component renders often with the **same** props.
- Its render is noticeably expensive (profile first).
- Its props are primitives or already stable references.

`memo` costs a props comparison on every render, so wrapping everything brings little benefit and adds noise.

## Modern note: React Compiler

React Compiler (v1.0, stable since October 2025) automatically memoizes components and JSX elements at build time, so in compiled projects you rarely write `memo` by hand. Understanding *why* reference equality matters is still essential for reading existing code, debugging, and working in codebases without the compiler.

## Legacy

Class components used `React.PureComponent` or `shouldComponentUpdate(nextProps, nextState)` for the same purpose. `memo` is the function-component equivalent.
