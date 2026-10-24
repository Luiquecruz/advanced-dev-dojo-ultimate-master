Every case returns a brand new array. `[...tasks, item]` appends, `tasks.map(...)` replaces one item and `tasks.filter(...)` removes one.
---
For the new id use `Math.max(0, ...tasks.map((task) => task.id)) + 1`. For toggling return `{ ...task, done: !task.done }` only for the matching id and `task` itself for the others.
---
In the component: `dispatch({ type: 'added', title: title.trim() })` followed by `setTitle('')`; `onChange={() => dispatch({ type: 'toggled', id: task.id })}`; `onClick={() => dispatch({ type: 'deleted', id: task.id })}`.
