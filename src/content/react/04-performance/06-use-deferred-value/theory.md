## Defer a value instead of an update

`useTransition` wraps the **code that sets state**. Sometimes you do not own that code: the value arrives as a prop, or it must stay urgent because it drives an input. `useDeferredValue` solves the same problem from the other side: it gives you a **lagging copy** of a value.

```jsx
import { useDeferredValue, useState } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  return (
    <>
      <input value={query} onChange={(event) => setQuery(event.target.value)} />
      <SlowResults query={deferredQuery} />
    </>
  );
}
```

## How it works

When `query` changes, React renders **twice**:

1. An **urgent** render where `query` is new but `deferredQuery` still holds the **old** value. The input updates immediately; `SlowResults` receives the same prop as before.
2. A **background** render (like a transition) where `deferredQuery` catches up. It is interruptible: if the user types again, React abandons it and starts over with the latest value.

So the input never waits for the results. To make step 1 cheap, the slow child must skip re-rendering when its props did not change. Wrap it in `memo` (or let the React Compiler do it):

```jsx
const SlowResults = memo(function SlowResults({ query }) {
  return <ul>{filterThousandsOfItems(query).map(renderItem)}</ul>;
});
```

Without `memo`, the urgent render would still re-render `SlowResults` with the old value, and the benefit is lost.

## Showing stale content

Compare the two values to know when the screen is out of date:

```jsx
const isStale = query !== deferredQuery;

<div aria-busy={isStale} style={{ opacity: isStale ? 0.5 : 1 }}>
  <SlowResults query={deferredQuery} />
</div>
```

## With Suspense

If the background render **suspends** (results read with `use(promise)`), React keeps showing the old results instead of the Suspense fallback, exactly like a transition. The fallback only appears on the very first load. The result is the classic "dim the old results while new ones load" pattern with no loading state of your own.

## Initial value (React 19)

`useDeferredValue(value, initialValue)` renders `initialValue` on the **first** render and then defers to `value` in the background. Useful to show a cheap placeholder first:

```jsx
const deferredQuery = useDeferredValue(query, '');
```

## Debounce vs deferred value

| | Debounce / throttle | `useDeferredValue` |
| --- | --- | --- |
| Delay | fixed (e.g. 300 ms) | none on fast devices, adapts on slow ones |
| Interruptible | no | yes |
| Reduces network calls | yes | no |

`useDeferredValue` optimizes **rendering**. If the goal is to send fewer requests, debounce the fetch as well.

## Pitfalls

- Pass **primitives** or values created outside render. `useDeferredValue({ query })` creates a new object every render, so it never settles.
- It does not make the slow component faster; it only stops it from blocking urgent updates.
- Do not combine it with `startTransition` for the same update: the deferred value already renders in a transition.

## Legacy note

Before concurrent rendering (React 18), the only options were debouncing, throttling or virtualization. Those remain useful (virtualization for very long lists especially), but they are about doing less work, while deferred values are about **scheduling** work.
