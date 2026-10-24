1. Add an `<li>` inside the `<ul>` with `v-for` over `todos`, exposing the index.
2. Key each `<li>` by `todo.id` so Vue tracks item identity.
3. Inside it, render the `<span>` with `index + 1` and the text, plus a button whose click calls `remove(todo.id)`.
4. Make the `<ul>` conditional on `todos.length` and add the `v-else` paragraph after it.
