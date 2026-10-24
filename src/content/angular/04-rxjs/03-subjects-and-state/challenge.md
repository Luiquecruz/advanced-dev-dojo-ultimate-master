Build a todo store the "classic" way, with a `BehaviorSubject`, and render it.

**`todo-store.ts`** — `TodoStore`, provided in root:

1. A **private** `BehaviorSubject<Todo[]>` starting with `[]`.
2. `todos$`: the read-only observable of the list (`asObservable()`).
3. `remaining$`: number of todos with `completed: false`, derived with `map`.
4. `add(title: string)`: appends `{ id, title, completed: false }` with ids `1, 2, 3…` as a **new** array.
5. `toggle(id: number)`: flips `completed` of that todo, again producing a new array (and a new todo object).

**`app.ts`** — `TodoList` (selector `app-todo-list`):

1. An `<input aria-label="New todo">` and an `Add` button that calls `store.add()` with the input value, then clears the input.
2. A `<li>` per todo showing its title; clicking the `<li>` toggles it.
3. `<p>N remaining</p>`.

The component reads the store through `toSignal()` (already set up in the starter).
