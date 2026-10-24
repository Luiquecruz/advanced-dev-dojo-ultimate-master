## Extract logic, not components

Components let you reuse **UI**. Custom Hooks let you reuse **stateful logic**: a subscription, a form field's validation, a timer, syncing with storage. A custom Hook is just a function whose name starts with `use` and that calls other Hooks.

```jsx
import { useEffect, useState } from 'react';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return isOnline;
}

function StatusBar() {
  const isOnline = useOnlineStatus();
  return <p>{isOnline ? 'Online' : 'Disconnected'}</p>;
}
```

`StatusBar` now says **what** it needs, not **how** it is obtained.

## Hooks share logic, not state

Each call to a custom Hook is completely independent. Two components calling `useOnlineStatus()` get two separate `isOnline` states (and two listeners); the same component calling `useLocalStorage` twice with different keys gets two separate values. To share **state** between components, lift it up or put it in context or an external store.

Custom Hooks re-run on every render of their component, so they always see the latest props and state:

```jsx
function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

## Designing a good custom Hook

- **Name it after its purpose**: `useChatRoom(roomId)`, `useMediaQuery(query)`, `useFormField(rules)`. Avoid lifecycle wrappers like `useMount(fn)` that hide what the Effect synchronizes with.
- **Return what callers need**: a value, a tuple mirroring `useState` (`[value, setValue]`), or an object when there are many fields.
- **Accept the reactive values it depends on** as arguments, and list them in its Effects' dependencies.
- **Follow the Rules of Hooks** inside it and from where it is called.
- **Don't use `use` for plain functions** that call no Hooks: the prefix tells the linter and the React Compiler that Hook rules apply.

## Lazy initial state

When the initial value is costly (parsing storage, building a big structure), pass a function to `useState`. React calls it on the first render only:

```jsx
const [value, setValue] = useState(() => JSON.parse(localStorage.getItem(key)));
```

Writing `useState(JSON.parse(localStorage.getItem(key)))` would read and parse storage on **every** render and throw away the result.

## Testing custom Hooks

React Testing Library's `renderHook` renders a Hook inside a throwaway component:

```jsx
const { result } = renderHook(() => useCounter(0));
act(() => result.current.increment());
expect(result.current.count).toBe(1);
```

## Pitfalls

- Returning a new object or function every render can break `memo` children or Effect dependencies in callers. Memoize the return value when callers depend on its identity (the React Compiler does this automatically).
- Storage APIs fail in private modes and SSR. Production versions of `useLocalStorage` wrap access in `try/catch`, check `typeof window`, and listen to the `storage` event to sync tabs (`useSyncExternalStore` is ideal for that).

## Legacy vs modern

Before Hooks, sharing logic meant **mixins** (`React.createClass`), **higher-order components** (`withRouter(Component)`) or **render props** (`<Mouse render={(pos) => ...} />`). They caused name clashes, "wrapper hell" in DevTools and unclear data sources. Custom Hooks replace all three with plain function composition. Libraries like VueUse (Vue) and `usehooks-ts` (React) are collections of such Hooks.
