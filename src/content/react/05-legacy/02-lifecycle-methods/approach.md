1. Identify the concern: "load the user for the current `userId`". In a class it must be wired into three lifecycle methods.
2. Implement `componentDidUpdate(prevProps)` and call `loadUser()` only when `prevProps.userId` differs from `this.props.userId`.
3. In `loadUser`, abort the previous controller (if any), create a new `AbortController`, store it on `this.controller` and pass its `signal` to `fetch`.
4. Catch the rejection and ignore errors whose `name` is `AbortError`.
5. Implement `componentWillUnmount` and abort the current controller.
6. Compare with the hooks version: one `useEffect` with `[userId]` and an abort cleanup does all of this.
