1. Make `fetchPosts` throw on non-OK responses; a query function signals errors only by rejecting.
2. Build `postsQueryOptions` with `queryOptions`, putting `userId` in the key because the query function depends on it. Each user gets its own cache entry.
3. Add `staleTime: 60_000` so cached data stays fresh for a minute and is served without a refetch when you come back.
4. Call `useQuery(postsQueryOptions(userId))` in `UserPosts`. Deduplication comes for free: components with the same key subscribe to the same cache entry.
5. Render the three states in order: pending, error, success.
