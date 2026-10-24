Build a reusable **task board** whose state is a graph of Jotai atoms: persisted filter, derived lists, action atoms and one private store per board.

**`atoms.js`**

- `tasksAtom`: primitive atom, starts as `[]` (done). Tasks look like `{ id, title, done }`.
- `filterAtom`: created with **`atomWithStorage('task-filter', 'all')`** from `jotai/utils`. Values: `'all'`, `'active'`, `'done'`.
- `visibleTasksAtom`: read-only derived atom. `'all'` returns every task, `'active'` the tasks with `done: false`, `'done'` the tasks with `done: true`.
- `remainingCountAtom`: read-only derived atom with the number of tasks not done.
- `toggleTaskAtom`: write-only atom (`atom(null, write)`) called with an `id`; it flips `done` of that task and writes a **new** array (never mutate the existing tasks).
- `clearDoneAtom`: write-only atom that removes every done task.

**`App.jsx`** (`FilterBar`, `TaskList` and `Footer` are already written)

- `HydrateTasks({ tasks, children })`: seeds `tasksAtom` with `useHydrateAtoms([[tasksAtom, tasks]])` and renders `children`.
- `TaskBoard({ initialTasks })`: wraps the board in a Jotai **`<Provider>`** and inside it in `<HydrateTasks tasks={initialTasks}>`, so two boards on the same page never share tasks.

Behaviors checked by the tests:

- The `All` / `Active` / `Done` buttons set the filter (`aria-pressed` marks the active one) and the list follows it.
- Checkboxes (labelled with the task title) toggle tasks; `<p data-testid="remaining">` shows `{n} remaining`.
- A filter stored in `localStorage` under `task-filter` is restored when a board mounts.
