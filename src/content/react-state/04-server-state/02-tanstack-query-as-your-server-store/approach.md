1. Centralize keys in factories built from a root (`['users']`), so every query and every invalidation uses the same, prefix-friendly shapes.
2. Put key, function and freshness together in `usersListOptions()` so every consumer shares the same cache entry and options.
3. Replace the duplicated `['admins']` and `['user-count']` queries with one shared query plus `select`: one request, many projections, and re-renders only when a projection changes.
4. Use `select` in the search query too, so the component receives exactly what it needs (the first match or `null`).
5. Make the posts query depend on the author: key it with `postKeys.byUser(author?.id)` and use `skipToken` until `author` exists, which prevents a wasted `userId=undefined` request.
6. Render each state explicitly: author pending, no match, posts pending, posts loaded.
