## Hide UI without throwing it away

Conditional rendering destroys what it hides:

```jsx
{tab === 'compose' && <ComposePanel />}
```

Switch tabs and back, and the draft the user typed is gone, because `ComposePanel` unmounted and its state was discarded. The classic workarounds both have costs:

| Workaround | Problem |
| --- | --- |
| Lift the state to the parent | every panel's internals leak upward |
| Hide with CSS (`hidden`, `display: none`) | the hidden panel keeps running effects, timers and subscriptions, and still re-renders at full priority |

React 19.2 added `<Activity>` to solve this properly:

```jsx
import { Activity } from 'react';

<Activity mode={tab === 'compose' ? 'visible' : 'hidden'}>
  <ComposePanel />
</Activity>
```

## What `mode="hidden"` does

- **Hides the DOM** with `display: none` (React sets it as `!important` inline style). The nodes stay in the document.
- **Preserves state**: `useState`, `useReducer` values and the DOM itself (input values, scroll position) survive.
- **Unmounts effects**: cleanups of `useEffect` and `useLayoutEffect` run, so subscriptions, intervals and connections stop. When the Activity becomes visible again, effects are re-created.
- **Defers updates**: hidden content still re-renders when its props change, but at the lowest priority, after everything visible.

`mode="visible"` (the default) behaves like normal rendering.

## Pre-rendering

Because hidden trees still render, `<Activity mode="hidden">` can prepare content the user will probably open next: data starts loading (with Suspense-enabled sources), code and images are fetched, and when the user switches the content appears instantly.

```jsx
<Activity mode={tab === 'history' ? 'visible' : 'hidden'}>
  <HistoryPanel />
</Activity>
```

Even if `history` was never shown, `HistoryPanel` has rendered in the background. Its effects, however, only run once it becomes visible.

## Pitfalls

- **Effects are the boundary.** Code that should only run while visible must live in effects. Work done during render (or in a `ref` callback) still happens while hidden.
- **Media keeps playing.** A `<video>` hidden with `display: none` is not paused automatically. Pause it in a layout effect cleanup.
- **Hidden is not free.** Each hidden tree keeps memory and still re-renders in the background. Don't wrap hundreds of rows in Activities.
- `<title>` and other hoisted tags from hidden trees are not applied (fixed in 19.3).

## Activity vs alternatives

| Goal | Use |
| --- | --- |
| Remove UI and reset its state | conditional rendering `{show && <X />}` |
| Reset state with the same element | change its `key` |
| Hide UI, keep state, pause effects | `<Activity mode="hidden">` |
| Purely visual hide, keep everything running | CSS |

Activity is also the foundation for features like keeping the previous route alive during back navigation in routers and frameworks.
