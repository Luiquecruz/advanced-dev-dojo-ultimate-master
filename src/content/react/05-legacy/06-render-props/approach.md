1. Implement `useToggle` with `useState` and a `toggle` that uses the updater form.
2. Implement `Toggle` as a one-liner on top of the hook: `return children(useToggle(initialOn))`. Old render-prop call sites and new hook call sites now share one implementation.
3. In `MouseTracker`, store the position in state, update it from the mouse event and call the `render` prop with it inside the tracker div.
4. In `App`, pass a function as the child of `<Toggle>` and return a fragment with the button (label depends on `on`) and the conditional paragraph.
