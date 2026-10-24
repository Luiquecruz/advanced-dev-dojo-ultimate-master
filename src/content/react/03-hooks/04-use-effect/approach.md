1. Inside the effect, create an `AbortController`.
2. Optionally reset `user` to `null` so the loading state shows on each change.
3. Fetch the URL built with a template literal, parse JSON and call `setUser`.
4. Return a cleanup that aborts the request: when `userId` changes, React runs the cleanup of the previous effect first, so the stale response never calls `setUser`.
5. Render `<h3>{user.name}</h3>` inside the article.
