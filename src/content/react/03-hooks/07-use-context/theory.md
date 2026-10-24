## The prop drilling problem

Passing data through props is explicit and easy to trace. It becomes painful when many components need the same value deep in the tree: every intermediate component must accept and forward a prop it does not use.

```jsx
<App theme={theme}>
  <Layout theme={theme}>
    <Toolbar theme={theme}>
      <ThemedButton theme={theme} />
```

**Context** lets a parent provide a value to **any** descendant, however deep, without passing it through every level.

## Three steps

**1. Create** the context with a default value, at module level:

```jsx
import { createContext } from 'react';

export const ThemeContext = createContext('light');
```

**2. Provide** a value around a subtree. In React 19 the context object itself is the provider:

```jsx
function App() {
  const [theme, setTheme] = useState('dark');
  return (
    <ThemeContext value={theme}>
      <Toolbar />
    </ThemeContext>
  );
}
```

**3. Consume** it in any descendant:

```jsx
import { useContext } from 'react';

function ThemedButton({ children }) {
  const theme = useContext(ThemeContext);
  return <button className={`btn btn-${theme}`}>{children}</button>;
}
```

`Toolbar` no longer knows about the theme at all.

## How the value is resolved

- React looks **up** the tree for the **nearest** provider of that context and uses its `value`.
- With no provider above, it uses the **default** passed to `createContext`. The default never changes; it is mostly useful for tests and isolated components.
- Providers can be **nested** to override a value for a part of the tree (a dark sidebar inside a light page).
- When a provider's `value` changes, **every** component reading that context re-renders, even if a parent in between is wrapped in `memo`.

## `use(Context)` in React 19

`use(ThemeContext)` works like `useContext` but may be called inside conditions and loops:

```jsx
function Badge({ show }) {
  if (!show) return null;
  const theme = use(ThemeContext);
  return <span className={theme}>New</span>;
}
```

## Performance pitfalls

Every consumer re-renders when the value changes, compared with `Object.is`. Passing a new object each render re-renders all consumers even if nothing changed:

```jsx
<AuthContext value={{ user, logout }}>
```

Memoize it (or rely on the React Compiler), or split rarely-changing and frequently-changing values into **separate contexts**:

```jsx
const value = useMemo(() => ({ user, logout }), [user, logout]);
```

## When to use context

Good fits: theme, current user, locale, router, a design system's configuration, and state that a whole feature needs (next lesson combines it with a reducer).

Before reaching for context, consider:

- **Passing props**: explicit data flow is easier to follow when the depth is small.
- **Composition**: pass JSX as `children` so intermediate components do not need the data (`<Layout><Avatar user={user} /></Layout>`).

Context is not a state manager by itself: it moves values through the tree. For high-frequency global state, libraries like Zustand or Redux offer selector-based subscriptions.

## Legacy vs modern

| Era | Provide | Consume |
| --- | --- | --- |
| React 15 legacy context (removed in 19) | `childContextTypes` + `getChildContext()` | `contextTypes` + `this.context` |
| React 16.3+ | `<ThemeContext.Provider value>` | `<ThemeContext.Consumer>{(v) => ...}`, `static contextType` |
| React 16.8+ | same | `useContext(ThemeContext)` |
| React 19 | `<ThemeContext value>` | `useContext` or `use` |

`<Context.Provider>` still works in React 19 but is planned for deprecation.
