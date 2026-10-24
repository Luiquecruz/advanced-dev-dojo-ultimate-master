1. Implement the three service methods with `get`, `post` and `patch`, typing each response.
2. Register `provideHttpClient()` in `appConfig`.
3. In the `TodoList` constructor, subscribe to `getAll()` and `set` the signal.
4. In `add()`, subscribe to `add(input.value)`, append the returned todo with `update`, then clear the input.
5. In `toggle()`, subscribe to `toggle(todo)` and swap the matching item for the response.
