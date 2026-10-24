1. Write a small helper that returns `displayName || name || 'Component'` for any component.
2. In `withLoading`, define an inner component that destructures `isLoading` and collects the rest with `...props`.
3. Return the status paragraph while loading; otherwise render the wrapped component with `{...props}`. Because React 19 passes `ref` as a regular prop, the spread forwards it too.
4. Assign the `displayName` on the inner component and return it.
5. In `withCurrentUser`, read the context with `useContext` inside the inner component (hooks are allowed there because it is a function component) and inject it before spreading the received props.
6. Compose both at module level so the enhanced component type is created exactly once.
