## Structure decides how many bugs you can write

Two components can behave identically while one is full of synchronization bugs and the other is not. The difference is usually the **shape of the state**. The React docs give five principles.

### 1. Group related state

If two values always change together, keep them together:

```jsx
const [x, setX] = useState(0);
const [y, setY] = useState(0);          // ⚠️ easy to update one and forget the other
const [position, setPosition] = useState({ x: 0, y: 0 }); // ✅
```

### 2. Avoid contradictions

Several booleans that describe one status can end up in impossible combinations:

```jsx
const [isSending, setIsSending] = useState(false);
const [isSent, setIsSent] = useState(false); // 🔴 both true is possible
```

Replace them with one variable that can only hold valid values:

```jsx
const [status, setStatus] = useState('typing'); // 'typing' | 'sending' | 'sent'
const isSending = status === 'sending';
```

### 3. Avoid redundant state

If a value can be **computed** from props or other state during render, it must not be state:

```jsx
const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [fullName, setFullName] = useState(''); // 🔴 must be kept in sync by hand

const fullName = `${firstName} ${lastName}`;   // ✅ always correct
```

Totals, counts, filtered lists and validation flags are all derived values. Computing them on each render is cheap; if it is expensive, `useMemo` (or the React Compiler) caches it.

Also avoid **mirroring props** in state: `useState(props.color)` only reads the prop on the first render and then silently ignores updates. Use the prop directly, or name it `initialColor` to make the "only initial" intent explicit.

### 4. Avoid duplication

Storing the same data twice means the copies can disagree:

```jsx
const [items, setItems] = useState(initialItems);
const [selectedItem, setSelectedItem] = useState(items[0]); // 🔴 a copy of an object in items
```

When an item is edited, `items` gets a new object, but `selectedItem` still points at the old one and the details panel shows stale data. Store the **id** instead and look the object up during render:

```jsx
const [selectedId, setSelectedId] = useState(null);
const selectedItem = items.find((item) => item.id === selectedId); // ✅ always current
```

A bonus: if the item is deleted, `find` returns `undefined`, so "selected but deleted" is handled for free.

### 5. Avoid deep nesting

Deeply nested trees (`places[0].childPlaces[3].childPlaces[1]`) are painful to update immutably. **Normalize** them like a database: a flat object keyed by id, with each item listing its children ids.

```js
const places = {
  0: { id: 0, title: 'Earth', childIds: [1, 2] },
  1: { id: 1, title: 'Africa', childIds: [] },
  2: { id: 2, title: 'Americas', childIds: [] },
};
```

Updating one place becomes `setPlaces({ ...places, [id]: { ...places[id], title } })`.

## Minimal state, maximal derivation

A useful exercise from "Thinking in React": for every piece of data, ask:

1. Does it remain unchanged over time? → not state (a constant or a prop).
2. Is it passed in from a parent via props? → not state.
3. Can you compute it from existing state or props? → **not state**.

Whatever remains is state.

## Legacy note

Class components often stored derived data in `this.state` and synced it in `componentDidUpdate` or `getDerivedStateFromProps`, a frequent source of bugs that the React team documented in "You Probably Don't Need Derived State" (2018). The same lesson applies to hooks: the fix is to derive during render, not to sync with effects.

## Pitfalls

- Syncing state with `useEffect` (`useEffect(() => setTotal(...), [items])`) is redundant state with an extra render.
- Storing selected objects instead of ids.
- Several booleans for one status.
