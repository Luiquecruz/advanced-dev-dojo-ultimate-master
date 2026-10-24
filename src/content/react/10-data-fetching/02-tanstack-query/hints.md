`fetch` resolves for HTTP 500. Add `if (!response.ok) throw new Error(...)` before `return response.json()` so TanStack Query sees the failure.
---
`postsQueryOptions` is a plain function: `return queryOptions({ queryKey: ['posts', userId], queryFn: () => fetchPosts(userId), staleTime: 60_000 });`.
---
In `UserPosts`: `const { data, isPending, isError } = useQuery(postsQueryOptions(userId));` then early-return for `isPending` and `isError` before mapping `data`.
