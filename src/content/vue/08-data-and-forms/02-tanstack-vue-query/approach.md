1. Import `useQuery`, `useMutation` and `useQueryClient` from `@tanstack/vue-query`.
2. Replace the placeholder refs with the destructured result of `useQuery({ queryKey: ['todos'], queryFn: fetchTodos })`.
3. Create the mutation with `mutationFn: createTodo` and an `onSuccess` that clears `title` and invalidates `['todos']`.
4. In `submit`, guard against empty titles and call `mutate` with the trimmed value.
