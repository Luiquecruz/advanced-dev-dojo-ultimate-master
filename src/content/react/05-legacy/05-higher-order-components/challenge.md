Write two HOCs and compose them.

1. **`export function withLoading(WrappedComponent)`** returns a component that:
   - renders `<p role="status">Loading...</p>` when its `isLoading` prop is truthy,
   - otherwise renders `WrappedComponent` with **every other prop** (do not pass `isLoading` down; `ref` must reach the wrapped component too, which React 19 does for free when you spread the props),
   - has `displayName` equal to `WithLoading(<name>)`, where `<name>` is the wrapped component's `displayName` or `name`.
2. **`export function withCurrentUser(WrappedComponent)`** returns a component that reads `UserContext` (already exported) and renders `WrappedComponent` with a `currentUser` prop plus all received props. An explicitly passed `currentUser` prop must win over the context value. Its `displayName` is `WithCurrentUser(<name>)`.
3. **`export const Greeting`** is `withCurrentUser(withLoading(GreetingView))`, built once at module level.
