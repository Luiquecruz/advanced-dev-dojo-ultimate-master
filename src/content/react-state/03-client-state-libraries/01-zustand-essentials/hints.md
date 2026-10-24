Actions can read the latest state with `get()`. `togglePlay`: `if (get().queue.length === 0) return; set((state) => ({ isPlaying: !state.isPlaying }));`.
---
`usePlayerStore()` without a selector subscribes to the whole store: every change re-renders. Pass a selector that returns just the value: `usePlayerStore((state) => state.isPlaying)`.
---
`useCurrentTrack` and `useQueueDuration` are safe without `useShallow` because they return an existing object or a number. `useQueueTitles` builds a new array, so it needs `usePlayerStore(useShallow((state) => state.queue.map((track) => track.title)))`.
---
`usePlayerActions = () => usePlayerStore((state) => state.actions)` returns the same object forever, because `set` never replaces `actions`.
