## State is a snapshot

When React renders a component, it hands it the state **for that render**. Everything created during that render (JSX, event handlers, timeouts scheduled from them) sees those fixed values. Setting state does not change the variable you already have; it requests a **new render** with a new value.

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
    console.log(count); // still 0 in this render
  }
  // ...
}
```

`count` is a plain `const` number. Calling `setCount` cannot magically change it; the *next* call of `Counter()` will receive `1`.

### Snapshots and async code

The snapshot sticks even when code runs later:

```jsx
function handleSend() {
  setTimeout(() => {
    alert(`You had ${count} unread messages`); // the value from the render where the click happened
  }, 3000);
}
```

This is usually what you want: an action uses the values from the moment the user triggered it. It becomes a problem when you want to compute the *latest* value.

## Batching

React **batches** state updates: it waits until all code in the event handler has run, then re-renders once with all the queued updates.

```jsx
function handleClick() {
  setCount(count + 1); // setCount(0 + 1)
  setCount(count + 1); // setCount(0 + 1)
  setCount(count + 1); // setCount(0 + 1)
}
```

All three calls read the same snapshot (`0`) and ask for `1`. One click → `1`, not `3`.

Since **React 18** batching is **automatic everywhere**: event handlers, `setTimeout`, promises and native listeners. In React 17 and earlier, updates inside timeouts or promises were applied one by one (unbatched), and the legacy `ReactDOM.unstable_batchedUpdates` was used to group them. `flushSync` from `react-dom` opts out when you need the DOM updated immediately (rare).

## Updater functions

To compute the next state from the **previous queued state**, pass a function to the setter:

```jsx
function handleClick() {
  setCount((previous) => previous + 1); // 0 → 1
  setCount((previous) => previous + 1); // 1 → 2
  setCount((previous) => previous + 1); // 2 → 3
}
```

React puts the updater in a queue. During the next render it runs the queue in order, feeding each updater the result of the previous one.

Mixed queues work too:

```jsx
setCount(count + 5);         // "replace with 5"
setCount((n) => n + 1);      // 5 → 6
setCount(42);                // "replace with 42"
```

### When to use an updater

- Several updates to the same state in one event.
- Updates scheduled for later (timeouts, intervals, promises), where the snapshot may be stale by the time the code runs.
- Handlers you want to keep stable (they no longer need `count` in scope).

A common naming convention is the first letter of the state (`n`, `c`) or `previous`/`prev`.

```jsx
function addLater() {
  setTimeout(() => {
    setCount((previous) => previous + 1); // ✅ uses the latest value when it runs
  }, 1000);
}
```

With `setCount(count + 1)` inside the timeout, clicking twice quickly schedules two timers that both read the same snapshot, so you get `1` instead of `2`.

## Pitfalls

- Updaters must be **pure**: no side effects, they may run twice in StrictMode.
- Do not read state after setting it to "see the new value". Compute the next value in a variable if you need it: `const next = count + 1; setCount(next); notify(next);`.
- Updaters are not always needed. `setIsOpen(true)` doesn't depend on the previous value, so a plain value is clearer.
