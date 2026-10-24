## State updates are not applied immediately

When you call a setter in an event handler, React **queues** the update. It batches every update from the same event and re-renders after your handler finishes. That is great for performance, but it means the DOM is still the **old** DOM for the rest of the handler:

```jsx
function handleAdd() {
  setTodos([...todos, newTodo]);
  listRef.current.lastElementChild.scrollIntoView();
}
```

This scrolls to the item that was last **before** the update, one step behind. The new `<li>` does not exist yet.

## flushSync: commit now

`flushSync` from `react-dom` forces React to process the updates inside its callback **synchronously**, render and update the DOM before returning:

```jsx
import { flushSync } from 'react-dom';

function handleAdd() {
  flushSync(() => {
    setTodos([...todos, newTodo]);
  });
  listRef.current.lastElementChild.scrollIntoView();
}
```

After `flushSync` returns, the new `<li>` is in the DOM and you can focus, measure or scroll to it.

## When it is the right tool

Use `flushSync` when imperative DOM code right after a state update depends on the **result** of that update:

- Scrolling to or focusing an item that was just added.
- Measuring an element that just changed size before positioning a popover.
- Third-party integrations that read the DOM synchronously, such as the browser's `onbeforeprint` event: update state inside `flushSync` so the print preview shows the latest UI.
- View transitions in vanilla `document.startViewTransition(() => flushSync(() => setState(...)))` code.

## Why it is an escape hatch

`flushSync` **hurts performance**: it opts out of batching and forces a synchronous render, which can block the main thread. react.dev calls it "uncommon" and lists the caveats:

- It can force pending Suspense boundaries to show their fallback.
- It may flush other pending updates too, not only the ones inside the callback.
- It cannot be called during render or inside an effect's synchronous body (React warns, because React is already rendering).

Before reaching for it, consider alternatives:

| Need | Alternative |
| --- | --- |
| Focus a newly mounted input | `autoFocus`, or a callback ref |
| Run code after every render where something changed | `useEffect` / `useLayoutEffect` |
| Scroll to the new item | a callback ref on the new item, or an effect depending on the list length |

`flushSync` wins when the follow-up action belongs to **one specific event** ("scroll only when the user clicked Add, not when data loaded"), which effects express poorly.

## Legacy notes

- React 17 and earlier batched only inside React event handlers. Updates in `setTimeout` or promises were applied **synchronously**, one render per `setState`. Code written then often accidentally relied on reading the DOM right after `setState` in async code.
- React 18 introduced **automatic batching** everywhere (timeouts, promises, native events) with `createRoot`. `flushSync` became the documented way to opt out.
- `unstable_batchedUpdates` (the old way to force batching outside React events) is no longer necessary.

## Class components

The same applies to `this.setState`. Classes could also use the second argument, `this.setState(update, callback)`, which runs after the update is committed. It is the closest class equivalent of "do something after this specific update".

## Pitfalls

- Wrapping everything in `flushSync` "to be safe": you lose batching and concurrent rendering benefits.
- Calling `flushSync` inside `useEffect` or render: React warns and cannot flush.
- Expecting `flushSync` to make the **state variable** current: `todos` in the handler is still the snapshot from this render. Read the DOM, or compute the new value in a local variable.
