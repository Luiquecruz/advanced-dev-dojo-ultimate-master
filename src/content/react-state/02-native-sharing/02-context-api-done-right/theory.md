## Context is transport, not storage

Context does one thing: it makes a value available to every component below a provider without passing props. It does **not** hold state, merge updates or offer selectors. The state still lives in a component (`useState`, `useReducer`) and context only **delivers** it. Keeping that distinction in mind explains every rule below.

Good fits:

- **Dependency injection**: an API client, a feature flag reader, the current locale or theme.
- **Feature-scoped state**: a wizard, a form section, a notifications system, a compound component (`<Tabs>` and `<Tabs.Panel>`).
- **Rarely changing app-wide values**: the authenticated user, permissions.

## Rule 1: a `null` default and a guarded hook

The default value passed to `createContext` is used when there is **no provider** above. A "helpful" default hides bugs:

```jsx
const NotificationsContext = createContext({ notify: () => {} });
```

A component rendered outside the provider gets the no-op, clicks do nothing, and nobody notices. Use `null` and turn the missing provider into an error:

```jsx
const NotificationsContext = createContext(null);

export function useNotifications() {
  const context = use(NotificationsContext);
  if (context === null) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
```

In TypeScript, `createContext<NotificationsValue | null>(null)` plus the guard gives consumers a non-null type. Legitimate defaults (a `'light'` theme that works without any provider) are the exception, not the rule.

## Rule 2: export a provider and a hook, not the context

The provider component owns the state and the update logic; consumers only see the hook.

```jsx
export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const notify = useCallback((message, type = 'info') => {
    setNotifications((previous) => [...previous, { id: crypto.randomUUID(), message, type }]);
  }, []);
  const dismiss = useCallback((id) => {
    setNotifications((previous) => previous.filter((notification) => notification.id !== id));
  }, []);
  const value = useMemo(() => ({ notifications, notify, dismiss }), [notifications, notify, dismiss]);
  return <NotificationsContext value={value}>{children}</NotificationsContext>;
}
```

The implementation can later move to a reducer, a store or the server without touching consumers.

## Rule 3: a stable value

Every consumer re-renders when the provided value changes by `Object.is`. An object literal `value={{ notifications, notify }}` is a **new object on every render of the provider**, so all consumers re-render whenever the provider's parent re-renders, even when nothing changed. Memoize the object with `useMemo` and the functions with `useCallback` (updater functions keep them dependency-free). With the React Compiler this memoization is automatic, but the rule is the same.

## Rule 4: React 19 syntax

- Render the context itself as the provider: `<NotificationsContext value={value}>`. `<Context.Provider>` still works but is the legacy form.
- Read it with `use(Context)`. Unlike `useContext`, `use` may be called inside conditions and loops.

## Scoping and nesting

A provider creates **one instance** of the state for its subtree. Two `<NotificationsProvider>` elements give two independent lists, which is ideal for reusable widgets (each editor pane with its own toasts). The nearest provider wins, so nested providers override outer ones: useful for theming a section differently.

```jsx
<NotificationsProvider>
  <App />
  <NotificationsProvider>
    <SettingsDialog />
  </NotificationsProvider>
</NotificationsProvider>
```

## Where to place the provider

As low as possible, as high as necessary: just above every component that needs it. Placing all providers at the root "to be safe" makes every feature global and every update app-wide. Placing it too low produces the classic bug of a component rendered outside its provider, which Rule 1 now reports loudly.

## When to use it / when not to

Use context to inject dependencies, to scope state to a feature or widget instance, and to share values that change rarely across a deep tree. Prefer composition when the problem is only a few levels of drilling. Avoid context for high-frequency state read by many components (mouse position, live data, large editable collections): every consumer re-renders on every change and there are no selectors. Use an external store with selectors there (`useSyncExternalStore`, Zustand, Redux Toolkit, Jotai), and a server cache for remote data.
