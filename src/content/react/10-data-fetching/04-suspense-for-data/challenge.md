Move loading states out of components and into **Suspense boundaries**.

The query descriptions `userQuery(userId)` and `postsQuery(userId)` are ready.

- `UserProfile({ userId })`: read the user with `useSuspenseQuery(userQuery(userId))` and render `<h2>{user.name}</h2>` and the email. No `isPending` check: the data is always defined.
- `UserPosts({ userId })`: read the posts with `useSuspenseQuery(postsQuery(userId))` and render a `<ul>` with one `<li>` per post `title`.
- `ProfilePage({ userId })`:
  - wraps everything in `<Suspense fallback={<p>Loading profile...</p>}>`;
  - inside it renders `UserProfile`, then a **nested** `<Suspense fallback={<p>Loading posts...</p>}>` around `UserPosts`, so the profile can appear while posts are still loading.

Do not use `useQuery`, `isPending` or `isLoading` anywhere in the file. Tests render `ProfilePage` inside their own `QueryClientProvider`.
