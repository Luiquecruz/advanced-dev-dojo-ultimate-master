Order the features so each one sees what it needs: `withEntities<Todo>()`, `withState(...)`, `withComputed(...)`, `withMethods(...)`, `withHooks(...)`.
---
`withComputed(({ entities, filter }) => ({ remainingCount: computed(() => entities().filter((todo) => !todo.completed).length), visibleTodos: computed(() => ...) }))`.
---
In `load`, `const todos = await firstValueFrom(http.get<Todo[]>('/api/todos'));` then `patchState(store, setAllEntities(todos), { loading: false });`.
---
`toggle`: `patchState(store, updateEntity({ id, changes: (todo) => ({ completed: !todo.completed }) }))`. Hooks: `withHooks({ onInit(store) { store.load(); } })`.
