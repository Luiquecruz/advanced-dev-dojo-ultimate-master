Build a posts browser in `App.vue` that fetches from the fake API every time the selected author changes. The `authors` list, the `<select>` and the four refs (`userId`, `posts`, `loading`, `error`) are already declared.

1. **Watch `userId` with `{ immediate: true }`** and request `GET /api/posts?userId=<id>` with `fetch`.
2. **Cancel stale requests**: create an `AbortController` on every run, pass its `signal` to `fetch`, and abort it from `onWatcherCleanup`. An aborted request must not set the error.
3. **Render exactly one state** below the select:
   - while loading: `<p>Loading posts…</p>` (with the `…` character)
   - on failure (network error or a non-2xx status): `<p role="alert">Could not load posts.</p>`
   - when the author has no posts: `<p>No posts yet.</p>`
   - otherwise a `<ul>` with one `<li>` per post showing its `title`
