## State lives in the tree, not in the component

State is not stored inside your component function. React keeps it in the **render tree**, attached to the **position** where a component is rendered. As long as the *same component type* is rendered at the *same position*, React keeps its state between renders.

```jsx
function App() {
  const [isFancy, setIsFancy] = useState(false);
  return (
    <div>
      {isFancy ? <Counter isFancy /> : <Counter />}
      <button onClick={() => setIsFancy(!isFancy)}>Toggle style</button>
    </div>
  );
}
```

Toggling keeps the counter's value. Both branches render a `Counter` as the first child of the `<div>`, so from React's point of view it is the **same counter** receiving different props. What matters is the position in the tree returned by your JSX, not where it appears in your source code.

## When state is destroyed

React **resets** a component's state when:

- The component stops being rendered at that position (`{show && <Counter />}` with `show` becoming false). Its state is gone; rendering it again starts fresh.
- A **different type** is rendered at the same position: switching `<Counter />` to `<p>` destroys the counter, and switching `<section><Counter /></section>` to `<div><Counter /></div>` destroys the whole subtree, because the parent type changed.
- The component's **key** changes.

This is also why you must never declare a component inside another component: each render creates a new function, a new type, and the state resets every time.

## The bug: state that should reset but doesn't

A chat app keeps a draft message in the `Chat` component:

```jsx
<Chat contact={selectedContact} />
```

Type "Hi Ada", switch to Alan, and the draft is still there, ready to be sent to the wrong person. `Chat` stayed at the same position with the same type, so React preserved its state and only changed the `contact` prop.

## Resetting with a key

Keys are not only for lists. A `key` tells React the **identity** of a component. Give `Chat` a key that changes with the contact:

```jsx
<Chat key={selectedContact.id} contact={selectedContact} />
```

Now switching contacts means "a different `Chat`": React unmounts the old one (dropping its state and DOM) and mounts a fresh one. Returning to Ada creates yet another fresh `Chat`, with an empty draft.

Common uses: a profile form that should reset when the user id changes, an editor per document, a wizard that restarts.

### Resetting by position

Rendering two components in **different positions** also keeps their states separate:

```jsx
{isPlayerA && <Counter person="Taylor" />}
{!isPlayerA && <Counter person="Sarah" />}
```

The key approach is usually clearer.

## Avoid resetting state with effects

A frequent anti-pattern is "when the prop changes, clear the state":

```jsx
useEffect(() => {
  setDraft(''); // 🔴 renders once with the stale draft, then again
}, [contact.id]);
```

It renders with stale data first, causes an extra render, and must be repeated for every piece of state. A `key` resets the entire subtree in one go. For adjusting **part** of the state when a prop changes, see the "You Might Not Need an Effect" lesson.

## Keeping state for removed components

If you *want* to keep state for components that are not visible (for example drafts per contact), you can:

- keep them all rendered and hide inactive ones with CSS or React 19.2's `<Activity mode="hidden">`,
- lift the state up into the parent (e.g. a `drafts` object keyed by contact id),
- persist it outside React (localStorage, a store).

## Pitfalls

- Changing a wrapper element type (`div` ↔ `section`) unexpectedly resets everything below it.
- Using random keys (`key={Math.random()}`) resets the component on every render.
- Keys only need to be unique among siblings.
