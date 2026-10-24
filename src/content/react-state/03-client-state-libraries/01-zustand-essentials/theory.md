## The mental model

A Zustand store is a **single immutable object outside React** plus a hook to subscribe to slices of it. `create` returns that hook, which is also the store API (`getState`, `setState`, `subscribe`, `getInitialState`). Under the hood it is `useSyncExternalStore` with a selector, exactly what you built in the previous module, so the same rules apply: selectors decide re-renders, and they must return stable references.

## Store design: state, actions, and an `actions` namespace

Keep actions **inside** the store, next to the state they change, and group them under one key:

```js
export const usePlayerStore = create((set, get) => ({
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  actions: {
    enqueue: (track) => set((state) => ({ queue: [...state.queue, track] })),
    next: () => {
      const { currentIndex, queue } = get();
      if (currentIndex < queue.length - 1) set({ currentIndex: currentIndex + 1 });
      else set({ isPlaying: false });
    },
  },
}));
```

- `set(partial)` shallow-merges one level; `set((state) => partial)` reads the current state first.
- `get()` reads the latest state inside an action, useful for guards and multi-step logic.
- The `actions` object is created once and **never changes**, so selecting it never causes re-renders, and components can destructure it freely.

## Export custom hooks, not the store

Components should not write selectors inline everywhere. Export small hooks that each select exactly one thing:

```js
export const useIsPlaying = () => usePlayerStore((state) => state.isPlaying);
export const useCurrentTrack = () => usePlayerStore((state) => state.queue[state.currentIndex] ?? null);
export const usePlayerActions = () => usePlayerStore((state) => state.actions);
```

This gives one place to change the state shape, prevents accidental whole-store subscriptions, and reads well in components.

## Selectors: atomic, derived, shallow

| Selector returns | Example | Safe? |
| --- | --- | --- |
| A primitive | `(s) => s.isPlaying` | Yes |
| An existing reference | `(s) => s.queue`, `(s) => s.actions` | Yes |
| A derived primitive | `(s) => s.queue.length` | Yes |
| A **new** array or object | `(s) => s.queue.map((t) => t.title)` | Needs `useShallow` |
| The whole store | `usePlayerStore()` | Works, but re-renders on **every** change |

A selector that builds a new array returns a different reference on every call. In Zustand 5 this causes an infinite loop error ("Maximum update depth exceeded"). Wrap it with `useShallow`, which keeps the previous result while it is shallowly equal:

```js
import { useShallow } from 'zustand/react/shallow';

export const useQueueTitles = () => usePlayerStore(useShallow((state) => state.queue.map((track) => track.title)));
```

Prefer **several atomic selectors** over one object selector; reach for `useShallow` when you genuinely need a derived collection or want to pick several fields at once.

## Outside React

```js
usePlayerStore.getState().actions.enqueue(track);
const unsubscribe = usePlayerStore.subscribe((state, previous) => {
  if (state.currentIndex !== previous.currentIndex) analytics.track('track_changed');
});
```

Event handlers in non-React code (WebSocket messages, keyboard shortcuts, router callbacks) can read and update the store directly.

## Resetting

`getInitialState()` returns the state the store was created with. `usePlayerStore.setState(usePlayerStore.getInitialState(), true)` replaces (the `true` flag) the state, which is how you reset between tests or on logout.

## When to use it / when not to

Use Zustand for **client state shared by distant components** that changes often or is needed outside React: a media player, an editor's selection and tools, a canvas, a multi-panel layout, a cart. It is small, has no provider, and selectors give precise re-renders. Do not use it for server data (use a query cache), for state used by one component (`useState`), for shareable view state (the URL), or as a dumping ground "because it is global": every field you add is a field every developer can couple to. For strict conventions, event logs and large teams, Redux Toolkit may fit better.
