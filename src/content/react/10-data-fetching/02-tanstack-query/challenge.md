Load a user's posts with **TanStack Query** and let the cache do the work.

Export from `App.jsx`:

- `fetchPosts(userId)`: fetches `/api/posts?userId={userId}`, throws an `Error` when `response.ok` is `false`, and returns the parsed JSON.
- `postsQueryOptions(userId)`: returns `queryOptions({ ... })` with
  - `queryKey: ['posts', userId]`
  - `queryFn` calling `fetchPosts(userId)`
  - `staleTime: 60_000` (one minute)
- `UserPosts({ userId })`: calls `useQuery(postsQueryOptions(userId))` and renders
  - `Loading posts...` while pending,
  - `<p role="alert">Could not load posts</p>` on error,
  - otherwise a `<ul>` with one `<li>` per post `title`.

The default `App` (already written) provides a `QueryClient` and lets you switch users in the preview. Tests render `UserPosts` inside their own fresh `QueryClientProvider`.

Expected behavior checked by the tests: two `UserPosts` with the same `userId` make **one** request, and switching back to a user already loaded shows the cached posts instantly without a new request.
