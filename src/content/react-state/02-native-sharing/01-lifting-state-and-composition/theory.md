## Lift to the closest common parent, not to the top

When two components need the same state, move it to their **closest common parent** and pass it down as props. The important word is *closest*. Lifting too high has two costs:

- **Coupling**: components far away from the feature now own its state, and every refactor touches them.
- **Re-renders**: when state changes, the component that owns it re-renders **with every child it renders**. State at the root re-renders the whole app on every keystroke.

```jsx
function Dashboard() {
  const [query, setQuery] = useState('');
  return (
    <>
      <SearchBox query={query} onQueryChange={setQuery} />
      <OrderList query={query} />
      <SalesChart />
    </>
  );
}
```

`SalesChart` does not use `query`, yet it re-renders on every keystroke because its parent does.

## Fix 1: move state down

Extract the components that use the state into a new component that owns it:

```jsx
function SearchPanel() {
  const [query, setQuery] = useState('');
  return (
    <>
      <SearchBox query={query} onQueryChange={setQuery} />
      <OrderList query={query} />
    </>
  );
}

function Dashboard() {
  return (
    <>
      <SearchPanel />
      <SalesChart />
    </>
  );
}
```

Typing now re-renders only `SearchPanel` and its children. This is **colocation**: state lives as close as possible to where it is used.

## Fix 2: lift content up (children as props)

Sometimes the state must wrap the expensive part, for example a theme frame around the whole dashboard. Pass the expensive part as `children`:

```jsx
function AccentFrame({ children }) {
  const [accent, setAccent] = useState('violet');
  return (
    <div className={`frame frame-${accent}`}>
      <AccentPicker value={accent} onChange={setAccent} />
      {children}
    </div>
  );
}

<AccentFrame>
  <SalesChart />
</AccentFrame>;
```

When `accent` changes, `AccentFrame` re-renders, but `children` is the **same element object** created by its parent, which did not re-render. React sees an identical element and skips it. No `memo` needed.

Both fixes are free, structural, and should be tried **before** `memo`, `useMemo` or `useCallback`.

## Composition kills prop drilling

Prop drilling is passing props through components that do not use them. Often the intermediate components are layout. Turn them into **slots**:

```jsx
function Layout({ header, sidebar, children }) {
  return (
    <div className="layout">
      <header>{header}</header>
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  );
}

<Layout header={<UserMenu user={user} />} sidebar={<Nav permissions={user.permissions} />}>
  <Orders userId={user.id} />
</Layout>;
```

The component that owns `user` renders the leaves directly; `Layout` never sees `user`. Reach for context only when the tree between owner and consumers is deep **and** not something you control as JSX.

## Designing lifted APIs

A lifted component becomes **controlled**: it receives `value` and `onChange` instead of owning state. Good conventions:

- Name callbacks after events: `onQueryChange`, `onSelect`.
- Support both modes when building reusable components: controlled with `value`, uncontrolled with `defaultValue`.
- Pass the minimal value (`selectedId`), not whole objects, so the child cannot hold stale copies.

## When to use it / when not to

Lift state when two or more siblings must stay in sync, and stop at their closest common parent. Move state down whenever a parent owns state that only part of its subtree uses. Use children and slot props to avoid drilling through layout and to keep expensive subtrees out of a re-rendering parent. Do not lift "just in case", do not jump straight to context or a global store because drilling is two levels deep, and do not reach for `memo` before checking whether restructuring the tree solves the problem.
