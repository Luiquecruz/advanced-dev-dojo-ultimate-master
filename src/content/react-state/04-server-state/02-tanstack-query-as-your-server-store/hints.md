Key factories are plain objects of functions: `list: () => [...userKeys.all, 'list']`. Building every key from `all` lets `invalidateQueries({ queryKey: userKeys.all })` hit lists and searches at once.
---
`select` runs on the cached data per observer: `useQuery({ ...usersListOptions(), select: (users) => users.length })`. Same key means same cache entry and one request, while each component only re-renders when its selected result changes.
---
For the dependent query, compute `author` from the first query, then `queryFn: author ? () => request(`/api/posts?userId=${author.id}`) : skipToken`. With `skipToken` the query stays pending without fetching until `author` exists.
