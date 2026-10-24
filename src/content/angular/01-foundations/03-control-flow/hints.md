A loop looks like `@for (task of visibleTasks(); track task.id) { <li>...</li> } @empty { <li>No tasks</li> }`. `$index` is available inside the block.
---
`@switch (task.priority) { @case ('high') { ... } @case ('low') { ... } }` — cases without a match simply render nothing, so `@default` is optional.
---
Declare the variable once with `@let open = openCount();` after the `</ul>`, then `@if (open === 0) { ... } @else { <p class="summary">{{ open }} open</p> }`.
