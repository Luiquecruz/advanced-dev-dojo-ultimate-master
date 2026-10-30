Start at the bottom layer. `fetch` only rejects on network failures, so `apiGet` has to check `response.ok` itself and throw `new ApiError(response.status, message)`. The class needs a constructor that calls `super(message)` and stores `status` and `name`.
---
`queryOptions` returns the object you pass it, typed. Build the child keys by spreading the root: `queryKey: [...productQueries.all().queryKey, 'list', { search: searchTerm }]`. Every `queryFn` calls `apiGet`, never `fetch`.
---
In the component, `useQuery(productQueries.list(searchTerm))` replaces the whole inline object. For the button, `const queryClient = useQueryClient()` and `queryClient.invalidateQueries({ queryKey: productQueries.all().queryKey })`; prefix matching reaches every list and detail. The error object of a failed query is the `ApiError`, so `productsQuery.error.status` is the number to show.
