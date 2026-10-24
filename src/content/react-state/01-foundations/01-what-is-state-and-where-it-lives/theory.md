## State is memory the UI depends on

A value is **state** when two things are true: it changes over time, and the screen must update when it changes. If it never changes, it is a constant. If it changes but the screen does not care (a timer id, the previous scroll position), it belongs in a `ref` or a plain variable. If it can be computed from other values, it is **derived**, and derived values are not state at all.

```jsx
function Cart({ items }) {
  const [couponCode, setCouponCode] = useState('');
  const timerRef = useRef(null);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

`couponCode` is state, `timerRef` is a mutable box React ignores, and `total` is derived on every render.

## The five kinds of state

Most "state management problems" come from mixing kinds that have different owners and lifetimes.

| Kind | Who owns the truth | Typical lifetime | Examples |
| --- | --- | --- | --- |
| Local UI state | one component | while it is mounted | open/closed, hovered row, active tab |
| Shared client state | the app, in the browser | the session | cart, selected workspace, theme |
| Server cache | **the backend** | until stale | users, orders, permissions |
| URL state | the address bar | navigation, bookmarks, links | filters, search term, page, selected id |
| Form state | the form while editing | until submit or cancel | draft values, errors, touched fields |

The key insight is the middle column. Server data is not *your* state: you hold a **copy** that can go stale, so it needs caching, refetching and invalidation. URL state is owned by the browser: back/forward and shared links must reproduce it. Form state is a **draft**: it should not leak into global stores on every keystroke.

## Two questions decide where state lives

1. **Who owns it?** If the backend owns it, use a server cache. If the URL should reproduce it, put it in the URL. Otherwise it is client state.
2. **Who reads and writes it, and for how long?** One component → `useState`. Siblings → lift to the closest common parent. A whole subtree that changes rarely → context. Many unrelated components, frequent updates, or access outside React → an external store.

A useful lifetime ladder, from shortest to longest:

```
render (derived) → mounted component (useState) → navigation (URL)
  → session (store) → reload (URL or storage) → forever (server)
```

Pick the shortest lifetime that satisfies the requirement. Longer lifetimes cost more: persistence needs migrations, global stores need conventions, servers need APIs.

## One source of truth

Every piece of information should be stored **once**. Copies drift.

```jsx
const [users, setUsers] = useState([]);
const [selectedUser, setSelectedUser] = useState(null);
```

After renaming a user in `users`, `selectedUser` still shows the old name. Store the identity instead and derive the object:

```jsx
const [selectedId, setSelectedId] = useState(null);
const selectedUser = users.find((user) => user.id === selectedId);
```

The same rule applies across kinds: if the active filter lives in the URL, do not also copy it into a store; read it from the URL.

## Common misclassifications

- **Server data in a global store.** You rebuild loading flags, deduplication and invalidation by hand, and the copy goes stale.
- **Filters in component state.** Reloading or sharing the link loses them; the back button does nothing useful.
- **Form drafts in a global store.** Every keystroke notifies unrelated subscribers, and "cancel" must undo global changes.
- **Derived values in state.** `filteredItems` next to `items` and `query` must be synchronized with an Effect, which costs an extra render and invites bugs.
- **Everything global "just in case".** Global state is the hardest to delete and the easiest to couple to.

## When to use it / when not to

Use this classification **before** writing any `useState` or choosing a library: name the kind, the owner and the lifetime, then pick the smallest tool that fits. Do not start from a library ("we use Redux, so it goes in Redux"). Most apps end up with mostly local state, a server cache for remote data, the URL for anything shareable, and a small global store, if any, for true client-wide state.
