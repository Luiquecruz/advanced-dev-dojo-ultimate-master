Every derived value is an atom with a read function: `atom((get) => ...)`. Read `filterAtom` and `tasksAtom` with `get` and return the filtered array; nothing derived should be stored.
---
Persistence is a one-line change: `export const filterAtom = atomWithStorage('task-filter', 'all');`. The value is JSON serialized for you.
---
Action atoms receive the setter arguments after `get` and `set`: `atom(null, (get, set, id) => set(tasksAtom, get(tasksAtom).map((task) => (task.id === id ? { ...task, done: !task.done } : task))))`.
---
`useHydrateAtoms` must run inside the `<Provider>` whose store it seeds, so `TaskBoard` returns `<Provider><HydrateTasks tasks={initialTasks}>...</HydrateTasks></Provider>` and `HydrateTasks` calls `useHydrateAtoms([[tasksAtom, tasks]])` before returning `children`.
