1. In `setState`, resolve the next state from a value or an updater, mirroring React's `setState` API.
2. Skip notifications when nothing changed (`Object.is`), so subscribers do not do useless work.
3. In `subscribe`, add the listener to the `Set` and return a cleanup that removes it. React calls it on unmount.
4. In `useStore`, call `useSyncExternalStore` with `store.subscribe` and a `getSnapshot` that applies the selector to the current state.
5. React compares consecutive snapshots with `Object.is`: changing an unrelated field returns the same slice, so the component does not re-render.
