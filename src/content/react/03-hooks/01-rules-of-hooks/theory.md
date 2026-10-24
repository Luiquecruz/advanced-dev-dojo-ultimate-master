## Hooks are identified by call order

A Hook is a function whose name starts with `use` and that "hooks into" React features: state, effects, context, refs. Hooks look like plain function calls, but React needs to know **which** state belongs to **which** call. It does not use names for that. It uses the **order** of the calls.

While rendering a component, React walks a list attached to its Fiber (its internal node). The first `useState` call reads slot 1, the second reads slot 2, and so on:

```jsx
function Profile() {
  const [name, setName] = useState('Ada');
  const [age, setAge] = useState(36);
  useEffect(() => {
    document.title = name;
  }, [name]);
  return <p>{name} ({age})</p>;
}
```

| Call order | Hook | Slot |
| --- | --- | --- |
| 1 | `useState('Ada')` | `name` |
| 2 | `useState(36)` | `age` |
| 3 | `useEffect(...)` | title effect |

If one render skips a call, every later Hook reads the **wrong slot**. React detects this in development and throws: *"Rendered fewer hooks than expected"* or warns that the order of Hooks changed.

## The two rules

1. **Only call Hooks at the top level.** Never inside conditions, loops, nested functions, `try/catch/finally` blocks, or after an early `return`.
2. **Only call Hooks from React functions:** function components or custom Hooks. Not from regular helpers, class components or event handlers.

```jsx
function Search({ enabled }) {
  if (!enabled) return null;
  const [query, setQuery] = useState('');
  return <input value={query} onChange={(event) => setQuery(event.target.value)} />;
}
```

The early `return` above means `useState` runs on some renders and not on others. Move every Hook above the condition:

```jsx
function Search({ enabled }) {
  const [query, setQuery] = useState('');
  if (!enabled) return null;
  return <input value={query} onChange={(event) => setQuery(event.target.value)} />;
}
```

Put the **condition inside the Hook** instead of the Hook inside the condition:

```jsx
useEffect(() => {
  if (!isOnline) return;
  const connection = connect();
  return () => connection.close();
}, [isOnline]);
```

## Why event handlers are off limits

Event handlers run **after** rendering, outside the Fiber's walk through its Hook list. Calling `useState` inside `onClick` has no slot to read. Read the value during render and use it in the handler:

```jsx
function SaveButton() {
  const theme = useContext(ThemeContext);
  function handleClick() {
    save(theme);
  }
  return <button onClick={handleClick}>Save</button>;
}
```

## The one exception: `use`

React 19's `use(resource)` reads a Promise or a context and **may** be called conditionally or inside loops, because it does not store state in a slot. It still must be called inside a component or Hook, and not inside `try/catch`.

```jsx
function Price({ showCurrency }) {
  if (showCurrency) {
    const currency = use(CurrencyContext);
    return <span>{currency}</span>;
  }
  return null;
}
```

## Custom Hooks share logic, not state

A function that calls Hooks must itself be a Hook, so name it `useSomething`. The `use` prefix is how the linter, the React Compiler and other developers know the rules apply. Every component that calls `useOnlineStatus()` gets its **own** independent state.

## Tooling enforces it

`eslint-plugin-react-hooks` ships two classic rules:

- `react-hooks/rules-of-hooks`: flags conditional, looped or misplaced Hook calls.
- `react-hooks/exhaustive-deps`: flags effect, memo and callback dependency arrays that miss reactive values.

Newer versions of the plugin also bundle the diagnostics powered by the React Compiler (purity, refs during render, set-state-in-render and more). Keep the recommended preset enabled: breaking these rules causes bugs that only show up on specific renders.

## Legacy note

Before Hooks (React 16.8, 2019), stateful logic lived in class components, and sharing it required **mixins** (deprecated), **higher-order components** or **render props**. Hooks replaced those patterns with plain function composition, which is why their rules exist: they trade a small constraint for composability.
