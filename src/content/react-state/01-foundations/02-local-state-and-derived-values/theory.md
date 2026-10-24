## Local state is the default

Most state should live in the component that uses it. Local state is the cheapest kind: it is created on mount, destroyed on unmount, invisible to the rest of the app and trivial to refactor. Every step away from it (lifting, context, stores) adds coupling.

The hard part is not `useState` itself. It is deciding **what** to store. The rule: store the **minimal set of independent facts**, derive everything else during render.

## Derive, do not synchronize

A value that can be computed from props or other state is derived. The classic mistake is storing it and keeping it in sync with an Effect:

```jsx
const [items, setItems] = useState([]);
const [query, setQuery] = useState('');
const [visible, setVisible] = useState([]);

useEffect(() => {
  setVisible(items.filter((item) => item.name.includes(query)));
}, [items, query]);
```

This renders twice per change (once with stale `visible`, once after the Effect), and any code path that forgets to update `visible` produces a bug. Compute it instead:

```jsx
const visible = items.filter((item) => item.name.includes(query));
```

Wrap it in `useMemo` only when profiling shows the computation is expensive, never to "keep it in sync". With the React Compiler enabled, even that becomes automatic.

## Store identities, not copies

Selections are the most common source of duplicated state:

```jsx
const [selected, setSelected] = useState(null);
<button onClick={() => setSelected(order)}>...</button>
```

`selected` is a snapshot of the object at click time. When the order changes (status updated, item removed), the details panel shows stale data. Store the id and look the object up:

```jsx
const [selectedId, setSelectedId] = useState(null);
const selected = orders.find((order) => order.id === selectedId) ?? null;
```

If the order disappears, `selected` becomes `null` automatically. The same applies to local overrides of server data: keep a `Set` of ids marked as read, not a modified copy of the whole list.

```jsx
const [readIds, setReadIds] = useState(() => new Set());
const isRead = (item) => item.read || readIds.has(item.id);
const markRead = (id) => setReadIds((previous) => new Set(previous).add(id));
```

Note the updater function and the **new** `Set`: mutating the existing one would not trigger a render.

## Props are not state

Copying a prop into state (`useState(props.items)`) freezes it at mount: later props are ignored. Read props directly. When a prop really is a starting value, name it `initialX` (`initialQuantity`) so the intent is explicit, and reset the component with a `key` when the identity changes:

```jsx
<OrderEditor key={order.id} initialNotes={order.notes} />
```

## Lazy initializers and refs

- `useState(() => expensiveSetup())` runs the function only on the first render. `useState(expensiveSetup())` runs it on every render and throws the result away.
- Values that must survive renders but never affect the output (interval ids, previous values for analytics, DOM nodes) belong in `useRef`. Updating a ref does not render.

## A checklist for each `useState`

1. Can it be computed from props or other state? → derive it.
2. Is it a copy of a prop? → read the prop.
3. Is it an object that also exists in a list? → store its id.
4. Do two state variables always change together? → merge them into one object or a reducer.
5. Does the screen depend on it? If not → `useRef`.

## When to use it / when not to

Use local state for anything one component reads and writes: toggles, drafts, selections, local filters, "seen" markers. Derive totals, counts, filtered and sorted lists, and selected objects during render. Move state out only when a real second reader appears (lift it), when it must be shareable (URL), when the backend owns it (server cache), or when many distant components need it (context or a store). Do not keep derived data in state, do not sync state with Effects, and do not copy props into state unless they are explicitly initial values.
