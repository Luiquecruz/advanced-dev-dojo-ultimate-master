1. Add `static getDerivedStateFromError(error)` returning `{ error }`: this is what switches the boundary to its fallback.
2. Add `componentDidCatch(error, info)` and forward `error` and `info.componentStack` to `onError` when it is provided.
3. Add a bound `reset` arrow field that sets `error` back to `null`.
4. In `render`, return `fallbackRender({ error, reset })` when an error is stored, otherwise `children`.
5. In `App`, wrap only `BuggyCounter` so the `<h1>` lives outside the boundary and survives the crash.
6. Write the fallback with `role="alert"`, the message `Something went wrong: {error.message}` and a `Try again` button wired to `reset`. Resetting remounts `BuggyCounter`, so its count starts at 0 again.
