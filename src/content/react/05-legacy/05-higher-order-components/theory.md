## A function that takes a component and returns a component

Before hooks, React had no built-in way to share stateful logic between components. The community answer was the **higher-order component (HOC)**: a plain function that receives a component and returns a new, enhanced one.

```jsx
function withLoading(WrappedComponent) {
  function WithLoading({ isLoading, ...props }) {
    if (isLoading) {
      return <p role="status">Loading...</p>;
    }
    return <WrappedComponent {...props} />;
  }
  return WithLoading;
}

const UserListWithLoading = withLoading(UserList);
<UserListWithLoading isLoading={loading} users={users} />;
```

The name mirrors higher-order functions: a HOC does not render anything itself, it **wraps**. Famous examples: `connect()` from React Redux, `withRouter()` from React Router v5, `withStyles()` from Material UI v4, `injectIntl()` from react-intl.

## The conventions

1. **Pass through unrelated props.** Destructure what the HOC consumes and spread the rest onto the wrapped component. The wrapper should be transparent.
2. **Do not mutate the input component.** Return a new component; never patch `WrappedComponent.prototype`.
3. **Set a `displayName`** so React DevTools shows `WithLoading(UserList)` instead of an anonymous wrapper:

```jsx
const name = WrappedComponent.displayName || WrappedComponent.name || 'Component';
WithLoading.displayName = `WithLoading(${name})`;
```

4. **Compose** HOCs like functions: `withCurrentUser(withLoading(UserList))`. Many codebases used a `compose()` helper for long chains.

## Injecting data

The most common HOC reads something (a store, context, router) and injects it as a prop:

```jsx
function withTheme(WrappedComponent) {
  return function WithTheme(props) {
    const theme = useContext(ThemeContext);
    return <WrappedComponent theme={theme} {...props} />;
  };
}
```

Putting `{...props}` **after** the injected prop lets callers override it explicitly, which is handy in tests.

## Pitfalls

- **Never create a HOC inside `render`.** `const Enhanced = withLoading(List)` inside a component body creates a brand-new component type on every render, so React unmounts and remounts the subtree each time and all state is lost. Create HOCs once, at module level.
- **Static methods are not copied.** `Enhanced.fetchData` is `undefined` unless you copy it (the `hoist-non-react-statics` package existed for this).
- **Refs.** Before React 19, `ref` was not a prop, so a HOC had to use `forwardRef` to pass refs through. In React 19, `ref` is a regular prop for function components, so `{...props}` forwards it automatically.
- **Wrapper hell.** Five HOCs produce five extra layers in DevTools, and it becomes unclear which HOC injected which prop. Two HOCs injecting the same prop name silently collide.

## Legacy vs modern: custom hooks

Hooks solved the same problem without extra components in the tree:

```jsx
function UserList() {
  const theme = useTheme();
  const { user } = useCurrentUser();
  // ...
}
```

| HOC | Custom hook |
| --- | --- |
| Adds a wrapper component | No extra component |
| Data arrives as implicit props | Explicit return values you name yourself |
| Prop name collisions possible | Destructure under any name |
| Works with class components | Function components only |

HOCs are still useful for **cross-cutting wrappers that change rendering** (authentication gates, error boundaries, feature flags) and when you must enhance class components. For sharing logic, write a custom hook.
