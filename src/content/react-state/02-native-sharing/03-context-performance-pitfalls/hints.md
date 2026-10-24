Each consumer re-renders when its context value changes. One value containing everything changes on every update, and is even rebuilt when nothing changed. Group data by who reads it and how often it changes.
---
Create `UserContext`, `CartContext` and `CartActionsContext` (all `null` by default) and nest the three providers around `children`. Reuse the guard by writing a helper like `useRequired(Context, 'useCart')`.
---
`dispatch` from `useReducer` is stable, so the actions object can be `useMemo(() => ({ addItem: (product) => dispatch(...), ... }), [])`.
---
`const cartValue = useMemo(() => ({ items, count: ..., total: ... }), [items]);` and `const userValue = useMemo(() => ({ user, signIn, signOut }), [user]);` (`setUser` is stable too).
