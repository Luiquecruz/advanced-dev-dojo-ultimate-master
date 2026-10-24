`v-for="(todo, index) in todos"` gives you both the item and its zero-based index. Add `1` to display the position.
---
Use `:key="todo.id"`, not the index. With index keys Vue reuses the node in position 0 for the next item, so the "same DOM node" test fails.
---
Put `v-if="todos.length"` on the `<ul>` and `v-else` on the `<p>All done!</p>` right after it.
