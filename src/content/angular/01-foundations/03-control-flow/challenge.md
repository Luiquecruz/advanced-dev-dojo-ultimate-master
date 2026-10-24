Finish the `TaskList` component in `app.ts` (selector `app-task-list`). It already has a `tasks` signal, a `filter` signal, the filter buttons, and two computed signals: `visibleTasks` and `openCount`.

Inside the `<ul>`:

1. Use `@for` over `visibleTasks()`, tracking by `task.id`, to render one `<li>` per task containing its position and title: `1. Write docs`, `2. Review PR`… (position is `$index + 1`).
2. Inside each `<li>`, use `@switch` on `task.priority`:
   - `'high'` → `<span class="badge">High</span>`
   - `'low'` → `<span class="badge">Low</span>`
   - anything else → no badge
3. When there is nothing to show, render a single `<li>No tasks</li>` using `@empty`.

After the list:

4. Declare `@let open = openCount();` and use `@if` / `@else` to render `<p class="summary">All done!</p>` when `open` is `0`, otherwise `<p class="summary">{{ open }} open</p>` (e.g. `2 open`).
