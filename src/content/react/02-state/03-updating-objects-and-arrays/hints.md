React compares the new state with the old one by reference. `todos.push(...)` followed by `setTodos(todos)` passes the *same* array, so React skips the render. Every handler must pass a **new** array.
---
Add with spread: `setTodos([...todos, newTodo])`. Delete with `filter`: `setTodos(todos.filter((todo) => todo.id !== id))`.
---
Toggle with `map`, and create a new object only for the matching todo: `todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))`. Copying the array is not enough if you still mutate the object inside it.
