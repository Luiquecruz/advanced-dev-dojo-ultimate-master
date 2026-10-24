`onMutate` runs before `mutationFn` and receives the same variables (`{ id, completed }` for the toggle, `id` for the delete). Whatever it returns arrives in `onError` as the third argument.
---
The pattern: `await queryClient.cancelQueries({ queryKey: todosKey }); const previous = queryClient.getQueryData(todosKey); queryClient.setQueryData(todosKey, (todos) => ...); return { previous };`
---
Roll back with `onError: (error, variables, onMutateResult) => queryClient.setQueryData(todosKey, onMutateResult.previous)`, re-sync with `onSettled: () => queryClient.invalidateQueries({ queryKey: todosKey })`, and render the alert when `toggle.isError || remove.isError`.
