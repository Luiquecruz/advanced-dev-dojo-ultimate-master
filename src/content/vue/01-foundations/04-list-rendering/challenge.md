Render the todo list in `App.vue`. The `todos` ref and the `remove(id)` function are already declared.

1. Inside the `<ul>`, render one `<li>` per todo with `v-for`, keyed by **`todo.id`**.
2. Each `<li>` contains a `<span>` with the position and the text, for example `1. Learn Vue`, and a `<button>` with the text `Remove` that calls `remove(todo.id)`.
3. When the list is empty, render `<p>All done!</p>` instead of the `<ul>`.

The tests also check that removing an item keeps the **same DOM node** for the remaining items, which only works with a stable key.
