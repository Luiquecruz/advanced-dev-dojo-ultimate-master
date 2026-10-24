1. Keep a single source of truth: only `tasksAtom` and `filterAtom` hold values; everything else is derived.
2. Swap `filterAtom` for `atomWithStorage('task-filter', 'all')` so the user's choice survives reloads without any effect code.
3. Write `visibleTasksAtom` and `remainingCountAtom` as read-only atoms using `get`; Jotai recomputes them only when their dependencies change.
4. Model mutations as write-only atoms. `toggleTaskAtom` maps to a new array with a new task object, `clearDoneAtom` filters to a new array. Components call them with `useSetAtom`, so they never subscribe to values they do not show.
5. Scope state per widget: `<Provider>` creates a private store for each `TaskBoard`, and a child component calls `useHydrateAtoms` to seed it once with `initialTasks`.
6. Test atom logic without React through `createStore()`: `store.set(toggleTaskAtom, 2)` then `store.get(remainingCountAtom)`.
