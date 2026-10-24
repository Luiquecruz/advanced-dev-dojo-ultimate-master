1. Inside the `<ul>`, open an `@for` block over `visibleTasks()` with `track task.id`.
2. Render `{{ $index + 1 }}. {{ task.title }}` in the `<li>`.
3. Add an `@switch (task.priority)` with two `@case` blocks that render the badge spans.
4. Close the loop with an `@empty` block containing `<li>No tasks</li>`.
5. Below the list, declare `@let open = openCount();` and branch with `@if (open === 0)` / `@else` to render the summary paragraph.
