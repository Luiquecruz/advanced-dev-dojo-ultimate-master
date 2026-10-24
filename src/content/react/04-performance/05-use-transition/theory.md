## Urgent vs non-urgent updates

Not every state update is equally important. Typing in an input, pressing a button or toggling a checkbox must feel **instant**. Rendering the next screen, filtering a huge list or loading a tab can take a moment. React lets you mark the second kind as a **transition**:

```jsx
import { useState, useTransition } from 'react';

function TabSwitcher() {
  const [tab, setTab] = useState('about');
  const [isPending, startTransition] = useTransition();

  function selectTab(nextTab) {
    startTransition(() => {
      setTab(nextTab);
    });
  }
}
```

`useTransition()` returns:

| Value | Meaning |
| --- | --- |
| `isPending` | `true` while the transition has not been committed yet |
| `startTransition(action)` | runs `action` and marks every state update inside it as a transition |

## What a transition changes

Updates inside `startTransition` get a **lower priority** and become **interruptible**:

1. **The UI stays responsive.** If the transition render is slow, React works on it in small slices and yields to the browser. A new urgent update (a keystroke) interrupts it, and React restarts the transition with the latest state.
2. **No unwanted loading states.** If the new screen **suspends** (lazy code or data read with `use`), React keeps showing the **current** screen instead of replacing it with the nearest `<Suspense>` fallback. You get `isPending` to show a subtle indicator instead.

Without a transition, switching to a tab that suspends hides the tab you were reading and flashes a spinner. With a transition, the old tab stays on screen, slightly dimmed, until the new one is ready.

```jsx
<nav style={{ opacity: isPending ? 0.6 : 1 }}>...</nav>
<Suspense fallback={<Spinner />}>
  {tab === 'posts' && <PostsTab />}
</Suspense>
```

Fallbacks still show on the **first** load of a boundary that has never had content. Transitions only avoid hiding content that is **already visible**.

## Rules and pitfalls

- **Controlled inputs cannot be transitions.** The text in an `<input>` must update synchronously. Keep `setText` urgent and wrap only the expensive follow-up update (or use `useDeferredValue`).
- The function passed to `startTransition` runs **immediately**. Only the state updates are deferred; it is not a `setTimeout`.
- Updates after an `await` inside an async action must be wrapped in another `startTransition`, because React cannot track the async context across `await` yet:

```jsx
startTransition(async () => {
  const saved = await saveDraft(draft);
  startTransition(() => {
    setStatus(saved.status);
  });
});
```

- Transitions do not make slow code faster. They change **when** and **how** React commits the result.

## Async transitions (React 19)

Since React 19, the action can be **async**. `isPending` stays `true` for the whole async function, which removes most hand-written `isLoading` state. This is the base of **Actions**, `useActionState` and `<form action>`, covered in the React 19 module.

```jsx
const [isPending, startTransition] = useTransition();

function handleSave() {
  startTransition(async () => {
    await fetch('/api/todos', { method: 'POST', body: JSON.stringify(draft) });
  });
}
```

## `startTransition` without the Hook

`import { startTransition } from 'react'` works outside components (routers, data libraries) but gives you no `isPending`. Inside components prefer the Hook.

## Legacy note

Before React 18 every update was urgent and rendering was synchronous. Apps faked priority with `setTimeout`, debouncing or `requestIdleCallback`, which delayed work without being interruptible. Concurrent rendering (React 18, `createRoot`) made transitions possible. Apps still on the legacy `ReactDOM.render` root (removed in React 19) never received concurrent features.
