Inside `withLoading`, declare a named inner function component, e.g. `function WithLoading({ isLoading, ...props }) { ... }`, and return it. Rest destructuring removes `isLoading` from what you spread.
---
Compute the name once: `WrappedComponent.displayName || WrappedComponent.name || 'Component'`, then assign `WithLoading.displayName = \`WithLoading(${name})\``.
---
In `withCurrentUser`, call `useContext(UserContext)` inside the inner component and render `<WrappedComponent currentUser={currentUser} {...props} />`. Spreading after the injected prop lets an explicit `currentUser` override it. Finally: `export const Greeting = withCurrentUser(withLoading(GreetingView));`.
