`useQuery` returns refs: `const { data: todos, isPending, isError } = useQuery({ queryKey: ['todos'], queryFn: fetchTodos })`. The template unwraps them.
---
Get the client with `useQueryClient()` inside `<script setup>`; it is the one installed by `VueQueryPlugin`.
---
`useMutation({ mutationFn: createTodo, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['todos'] }) })`. Returning the promise from `onSuccess` keeps the mutation pending until the refetch finishes.
---
Call `mutation.mutate(title.value.trim())` in `submit`. In the script, mutation state is a ref: `addTodo.isPending.value`.
