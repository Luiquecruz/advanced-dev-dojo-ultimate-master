Complete `TodosStore` in **`todos.store.ts`**. The `TodoList` component in `app.ts` is already written and shows how the store is used. The fake API serves `GET /api/todos` with three todos (`Learn JSX` is completed).

1. Add `withEntities<Todo>()` so the store has `ids`, `entityMap` and `entities`.
2. Keep the existing `withState({ filter: 'all', loading: false })`.
3. `withComputed`:
   - `remainingCount`: number of todos that are not completed.
   - `visibleTodos`: all todos for `'all'`, only open ones for `'active'`, only completed ones for `'completed'`.
4. `withMethods` (inject `HttpClient`):
   - `load()`: sets `loading: true`, fetches `/api/todos`, stores them with `setAllEntities` and sets `loading: false`.
   - `toggle(id)`: flips `completed` with `updateEntity`.
   - `remove(id)`: deletes with `removeEntity`.
   - `setFilter(filter)`: patches `filter`.
5. `withHooks`: call `load()` in `onInit`.
