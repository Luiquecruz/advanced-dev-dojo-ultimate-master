## Effects are an escape hatch

Effects synchronize React with **external systems**. A lot of code written with `useEffect` talks to no external system at all: it transforms data or reacts to a user action. That code is slower (extra render passes), harder to follow, and prone to bugs. Two questions remove most unnecessary Effects:

1. **Can I calculate it during render?** Then it is not state.
2. **Did a specific user interaction cause it?** Then it belongs in the event handler.

## Derived data: compute during render

```jsx
function Form() {
  const [firstName, setFirstName] = useState('Ada');
  const [lastName, setLastName] = useState('Lovelace');
  const [fullName, setFullName] = useState('');
  useEffect(() => {
    setFullName(`${firstName} ${lastName}`);
  }, [firstName, lastName]);
}
```

This renders with a stale `fullName`, commits, runs the Effect, sets state and renders **again**. Compute it instead:

```jsx
const fullName = `${firstName} ${lastName}`;
```

The same applies to filtered or sorted lists, totals, validation flags, anything derived from props and state. If the calculation is expensive, wrap it in `useMemo` (or let the React Compiler memoize it), still without an Effect.

## User events: handle them in the handler

```jsx
useEffect(() => {
  if (product.isInCart) {
    showNotification(`Added ${product.name}!`);
  }
}, [product]);
```

This shows the notification on page load too, because the Effect does not know **why** `product` changed. Logic that should run because the user clicked belongs in the click handler:

```jsx
function handleBuy() {
  addToCart(product);
  showNotification(`Added ${product.name}!`);
}
```

The same goes for POST requests on submit, analytics for a click and notifying a parent (`onChange(value)`) after a local update.

## Resetting state when a prop changes: use a `key`

```jsx
useEffect(() => {
  setComment('');
}, [userId]);
```

Instead, let React treat each user as a different component:

```jsx
<Profile userId={userId} key={userId} />
```

A different `key` remounts the subtree with fresh state, without the intermediate render showing the old comment.

## Chains of Effects

Effects that set state that triggers other Effects ("when `card` changes set `goldCount`, when `goldCount` changes set `round`...") cause a cascade of renders and are hard to follow. Compute what you can during render and update everything in the event handler that started the chain.

## Notifying parents

Calling `onChange(isOn)` in an Effect after `setIsOn` runs one render late and on mount. Call both in the handler:

```jsx
function handleClick() {
  const next = !isOn;
  setIsOn(next);
  onChange(next);
}
```

Even better: lift the state up and make the component fully controlled by its parent.

## When an Effect IS right

- Subscribing to a browser API or store (`useSyncExternalStore` is often better).
- Syncing a non-React widget (map, chart, video player) with props.
- Fetching data because the component is **displayed** (with cleanup for race conditions), although frameworks and data libraries do this better.
- Analytics for "page viewed", since it is caused by display, not by a click.

## Quick reference

| Situation | Instead of an Effect |
| --- | --- |
| Value computed from props/state | compute during render (`useMemo` if expensive) |
| Reset all state on prop change | `key` |
| Adjust part of the state on prop change | compute during render or store an id instead of an object |
| Logic caused by a user action | event handler |
| Notify parent of a change | call the callback in the same handler |
| Subscribe to external store | `useSyncExternalStore` |

## Legacy note

These anti-patterns come from class components: `componentDidUpdate` comparing `prevProps` and `getDerivedStateFromProps` copying props into state. Their Hook translations inherit the same problems; the modern guidance is to avoid storing derived data in the first place.
