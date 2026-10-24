`memo(Component)` returns a new component that skips rendering when every prop is `Object.is`-equal to the previous one.
---
After wrapping, the list still re-renders. Look at each prop: `users` and `onRender` come from the test unchanged, but `options={{ showEmail: true }}` is created fresh on every render of `Dashboard`.
---
Move the object out of the component: `const LIST_OPTIONS = { showEmail: true };` at module level, then pass `options={LIST_OPTIONS}`. Export with `export const UserList = memo(function UserList({ users, options, onRender }) { ... });`.
