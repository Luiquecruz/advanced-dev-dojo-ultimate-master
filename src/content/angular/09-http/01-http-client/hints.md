Typed requests: `this.http.get<Todo[]>('/api/todos')`. The generic only describes the expected JSON; it does not validate it.
---
`post(url, body)` and `patch(url, body)` serialize the body as JSON automatically: `this.http.post<Todo>('/api/todos', { title })`.
---
HttpClient observables are **cold**: nothing is sent until you subscribe. `this.todoService.getAll().subscribe((todos) => this.todos.set(todos));`
---
Update the signal immutably: `this.todos.update((todos) => [...todos, todo])` to append, and `todos.map((entry) => (entry.id === updated.id ? updated : entry))` to replace.
