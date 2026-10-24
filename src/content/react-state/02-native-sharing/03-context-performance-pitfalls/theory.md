## How context updates propagate

When a provider renders with a value that is not `Object.is` equal to the previous one, React finds **every component that reads that context** below it and re-renders it. Two consequences surprise people:

- `memo` does **not** protect a component from its own context: if it reads the context, it re-renders.
- There are **no selectors**. A component that reads `{ user, cart }` only to show `user.name` still re-renders when the cart changes.

So the granularity of a context value is the granularity of your re-renders.

## Measure before and after

Do not guess. Three tools:

- **React DevTools Profiler**: record an interaction, inspect which components rendered and why ("Context changed", "Props changed", "Parent rendered"). Enable "Highlight updates when components render" for a quick visual.
- **`<Profiler id onRender>`**: the programmatic version. `onRender` fires after each commit of the wrapped subtree, so you can assert render counts in tests.
- **A render counter** in a component (`renders()` from a test mock) for unit-level checks.

```jsx
<Profiler id="badge" onRender={(id, phase) => console.log(id, phase)}>
  <UserBadge />
</Profiler>
```

## Pitfall 1: a new value object on every render

```jsx
<ShopContext value={{ user, items, addItem }}>
```

Whenever the provider re-renders, for any reason, every consumer re-renders. Memoize the object with `useMemo` and make the functions stable (`useCallback`, or a `useReducer` dispatch, which is always stable).

## Pitfall 2: one context for unrelated concerns

The user changes once per session; the cart changes on every click. In a single context, every cart update re-renders the avatar, the account menu and anything else that reads the user. **Split by concern** (and by update frequency): `UserContext`, `CartContext`.

## Pitfall 3: state and actions together

Product cards only call `addItem`; they never display the cart. If actions live in the same value as `items`, every card re-renders on every add. Put actions in their own context whose value never changes:

```jsx
const cartActions = useMemo(
  () => ({
    addItem: (product) => dispatch({ type: 'added', product }),
    removeItem: (id) => dispatch({ type: 'removed', id }),
  }),
  [],
);
```

## Pitfall 4: derived values computed in every consumer

If every consumer computes `items.reduce(...)`, the work multiplies. Compute derived values (count, total) once in the provider, inside the same `useMemo` as the cart value.

## The provider's children are free

A provider written as `function ShopProvider({ children })` that renders `{children}` does not re-render its children when its own state changes: they are elements created by its parent. Only consumers re-render. Keep that shape; avoid providers that render the app tree themselves.

## The resulting shape

```jsx
<UserContext value={userValue}>
  <CartActionsContext value={cartActions}>
    <CartContext value={cartValue}>{children}</CartContext>
  </CartActionsContext>
</UserContext>
```

Each hook (`useUser`, `useCart`, `useCartActions`) reads exactly one context, and each consumer subscribes only to what it uses.

## When splitting is not enough

If a single concern is read by many components that each need a different slice (a large form, a spreadsheet, a live dashboard), splitting contexts explodes into dozens of providers. That is the signal to move the state to an **external store with selectors** (`useSyncExternalStore`, Zustand, Redux Toolkit, Jotai), which re-render a component only when its selected slice changes. The React Compiler memoizes values for you, but it cannot add selectors to context.

## When to use it / when not to

Apply these fixes when profiling shows context-driven re-renders that matter: slow interactions, large lists, expensive children. Split by concern and frequency, isolate actions, memoize values and derived data. Do not pre-split tiny contexts that change rarely (theme, locale): the extra providers cost readability for no gain. When you find yourself wanting selectors, stop optimizing context and use a store.
