Start with the store: without `middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(todosApi.middleware)` RTK Query refuses to run. Then add `tagTypes: ['Todo']` to `createApi`.
---
`providesTags` and `invalidatesTags` accept an array or a function `(result, error, arg) => tags`. For the list: `providesTags: (result = []) => [{ type: 'Todo', id: 'LIST' }, ...result.map(({ id }) => ({ type: 'Todo', id }))]`.
---
`getTodo` provides `(result, error, id) => [{ type: 'Todo', id }]`, `addTodo` invalidates `[{ type: 'Todo', id: 'LIST' }]`, and `updateTodo` invalidates `(result, error, { id }) => [{ type: 'Todo', id }]`. Invalidating the plain string `'Todo'` would also refetch todo 3.
