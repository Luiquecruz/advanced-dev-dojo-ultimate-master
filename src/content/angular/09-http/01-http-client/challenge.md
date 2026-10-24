Connect a todo list to the REST API with `HttpClient`. The project has two files.

**`todo.service.ts`** (`TodoService`, provided in root)

1. `getAll(): Observable<Todo[]>` → `GET /api/todos`
2. `add(title: string): Observable<Todo>` → `POST /api/todos` with the body `{ title }`
3. `toggle(todo: Todo): Observable<Todo>` → `PATCH /api/todos/<id>` with the body `{ completed: !todo.completed }`

**`app.ts`** (`TodoList`, template already written)

4. In the constructor, load all todos and store them in the `todos` signal.
5. `add()` sends the input value, appends the **todo returned by the server** to the list and clears the input.
6. `toggle()` replaces the matching todo with the server response.
7. `appConfig` provides `HttpClient` with `provideHttpClient()`.
