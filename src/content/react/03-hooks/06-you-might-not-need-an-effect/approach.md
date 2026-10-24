1. Spot that `visible` is derived data: it depends only on `products` and `query`, so storing it in state forces an extra render after each commit.
2. Delete the `visible` state and its Effect, and compute `visible` as a `const` during render.
3. Spot that `onSearch` is caused by typing, a user event. The Effect also fires on mount, which the user never triggered.
4. Move the `onSearch` call into a change handler next to `setQuery`, passing the new value from the event (state updates are not visible until the next render).
5. Remove `useEffect` from the imports. Each interaction now produces exactly one commit.
