Finish the `TaskBoard` by implementing its reducer and wiring the events.

**`tasksReducer(tasks, action)`** (named export) must be pure and never mutate `tasks`:

| `action` | Result |
| --- | --- |
| `{ type: 'added', title }` | new array with `{ id, title, done: false }` appended; `id` is the highest existing id + 1 |
| `{ type: 'toggled', id }` | new array where only that task has `done` flipped (a new object); other task objects stay the same references |
| `{ type: 'deleted', id }` | new array without that task |
| anything else | `throw` an `Error` |

**`TaskBoard`** (default export) already uses `useReducer` with three tasks:

- Clicking **Add** dispatches `added` with the trimmed text of the `New task` input, then clears the input.
- Each checkbox (labelled with the task title) dispatches `toggled`.
- Each **Delete {title}** button dispatches `deleted`.
- The `<p>` shows how many tasks are not done, e.g. `2 left`.
