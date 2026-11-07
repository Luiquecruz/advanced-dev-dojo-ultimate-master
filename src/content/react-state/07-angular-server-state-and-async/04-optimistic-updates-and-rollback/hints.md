Write a private `patch(id, changes)` that does `this.list.update((todos) => todos.map((todo) => (todo.id === id ? { ...todo, ...changes } : todo)))`.
---
In `toggle`, find the todo first, remember `before.completed`, patch, then `await this.save(...)` inside `try`.
---
In `catch`, patch with `{ completed: before.completed }` and set the error message. Do not restore the whole list.
