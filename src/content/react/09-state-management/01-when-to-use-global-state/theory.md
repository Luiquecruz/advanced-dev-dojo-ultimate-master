## Not all state is the same

Before reaching for a library, classify the state you are holding. Most "global state problems" disappear once each kind of state lives in the right place.

| Kind | Examples | Best home |
| --- | --- | --- |
| Local UI state | input text, open/closed, hover | `useState` / `useReducer` in the component |
| Shared UI state | selected tab used by two siblings | lift it to the closest common parent |
| Server state | users, posts, todos from an API | a query library (TanStack Query, SWR) or framework loaders |
| URL state | filters, page number, search term | the router (`useSearchParams`, route params) |
| Form state | field values, errors, touched | the form itself, React Hook Form, form actions |
| Global client state | theme, auth session, cart, feature flags | context or an external store |
| Derived state | totals, filtered lists | **compute during render**, never store |

The last row matters most: if a value can be computed from props or other state, store the source and compute the rest.

```jsx
const [items, setItems] = useState([]);
const total = items.reduce((sum, item) => sum + item.price, 0);
```

## The escalation ladder

Climb only as high as the problem requires:

1. **Keep it local.** State used by one component stays there.
2. **Lift state up.** Two siblings need it: move it to the parent and pass props.
3. **Use composition.** Prop drilling through layout components often goes away by passing `children` or elements instead of data.
4. **Use context.** Values read by many distant components that change rarely (theme, locale, current user).
5. **Use an external store.** Frequently changing state read by many components, or logic you want outside React (Zustand, Redux Toolkit, Jotai).

```jsx
function Layout({ sidebar, children }) {
  return (
    <div className="layout">
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  );
}

<Layout sidebar={<UserMenu user={user} />}>
  <Dashboard user={user} />
</Layout>;
```

`Layout` never sees `user`, so nothing is drilled through it.

## Context is transport, not a state manager

Context moves a value down the tree. It has no selectors: **every consumer re-renders when the provided value changes**, even if it only reads one field.

```jsx
const AppContext = createContext(null);

function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  return <AppContext value={{ user, setUser, cart, setCart }}>{children}</AppContext>;
}
```

Adding to the cart re-renders every component that only reads `user`. Mitigations: split contexts by concern, memoize the value, or move fast-changing state into a store with selectors.

External stores (Zustand, Redux, Jotai) subscribe each component to **exactly the slice it selects**, using `useSyncExternalStore` under the hood, so unrelated updates do not re-render it.

## Server state is not global state

The biggest historical mistake was putting API data in Redux: actions for `FETCH_START`, `FETCH_SUCCESS`, `FETCH_ERROR`, manual loading flags, manual cache invalidation. Server state is a **cache of data owned by someone else**. It needs deduplication, background refetching, staleness rules and invalidation, which query libraries provide out of the box. Once server state moves out, the truly global client state is usually small.

## A short history

- **2015 to 2019**: Flux, then Redux everywhere, often with `connect()` and lots of boilerplate. Many apps stored everything globally "just in case".
- **2019**: Hooks and the stable Context API made local and lifted state far easier.
- **2020 onwards**: Redux Toolkit replaced hand-written Redux; Zustand and Jotai offered minimal stores; TanStack Query and SWR took over server state; frameworks (Next.js, React Router) moved data loading to the route level.

## Pitfalls

- **Duplicating props into state** (`useState(props.user)`) creates two sources of truth that drift apart.
- **Storing derived data** (`filteredTodos` next to `todos`) requires keeping both in sync manually.
- **One giant context** for the whole app re-renders everything on every change.
- **Global state for form inputs** makes every keystroke update a store read by unrelated screens.

## When to use a global store

Reach for one when several conditions hold: state is read and written by many unrelated components, it changes often, you need it outside React (for example in a WebSocket handler), or you want devtools, middleware and time-travel debugging. Otherwise, local state plus a query library is enough for most apps.
