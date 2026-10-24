Use the TanStack Query cache as the **server store** of a small directory: hierarchical key factories, shared queries with `select`, and a dependent query.

Export from `App.jsx`:

**Key factories**

- `userKeys.all` is `['users']`; `userKeys.list()` returns `['users', 'list']`; `userKeys.search(term)` returns `['users', 'search', term]`. Build them from `all`.
- `postKeys.all` is `['posts']`; `postKeys.byUser(userId)` returns `['posts', { userId }]`.
- `usersListOptions()` returns `queryOptions` with `queryKey: userKeys.list()`, a `queryFn` fetching `/api/users` and `staleTime: 60_000`.

**Shared query, different views**

- `UserCount` renders `<p data-testid="user-count">{n} users</p>` (`Counting...` while loading).
- `AdminList` renders `<ul aria-label="Admins">` with one `<li>` per user whose `role` is `'admin'`.
- Both spread `usersListOptions()` and derive their data with **`select`**, so they share **one** cache entry and **one** request. No extra keys, no filtering of raw data in render.

**Dependent query: `AuthorPosts({ authorName })`**

- Query 1: key `userKeys.search(authorName)`, fetches `/api/search?q={authorName}` and uses `select` to return the first match or `null`.
- Query 2: key `postKeys.byUser(author?.id)`, fetches `/api/posts?userId={id}`; it must **not run** until the author is known: pass `skipToken` as `queryFn` (or `enabled: Boolean(author)`).
- Renders `Loading author...`, then `No author found` when there is no match, otherwise an `<h3>Posts by {name}</h3>` followed by `Loading posts...` or a list of post titles.

Tests render the components inside their own `QueryClientProvider` with a fresh `QueryClient`.
