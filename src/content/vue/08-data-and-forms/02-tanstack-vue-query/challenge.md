Replace hand-written loading flags with **TanStack Vue Query**. `api.ts` exports `fetchTodos()` (throws on non-2xx) and `createTodo(title)` (POSTs to `/api/todos`). `main.ts` installs `VueQueryPlugin` with a `QueryClient`.

In **`App.vue`**:

1. Load the todos with `useQuery` using the query key `['todos']` and `fetchTodos` as the query function.
2. Render exactly one state:
   - while pending: `<p>Loading todos…</p>`,
   - on error: `<p role="alert">Could not load todos.</p>`,
   - otherwise a `<ul>` with one `<li>` per todo showing its `title`.
3. Create a mutation with `useMutation` whose `mutationFn` is `createTodo`. On success, clear the input and **invalidate** the `['todos']` query (`queryClient.invalidateQueries`) so the list refetches.
4. Submitting the form (input labelled `New todo`, button `Add`) runs the mutation with the trimmed title. Ignore empty titles.
