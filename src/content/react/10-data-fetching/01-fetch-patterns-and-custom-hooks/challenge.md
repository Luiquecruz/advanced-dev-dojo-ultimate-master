Extract data fetching into a reusable **custom hook** and use it in a component.

**`useFetch.js`** — export `useFetch(url)` returning `{ data, error, isLoading }`:

- Initial state: `{ data: null, error: null, isLoading: true }`.
- Fetch `url` in an effect that depends on `url`. When the URL changes, reset to the loading state and fetch again.
- If `response.ok` is `false`, treat it as an error: `new Error(`Request failed with status ${response.status}`)` (for example `Request failed with status 500`).
- Success: `{ data: <parsed JSON>, error: null, isLoading: false }`.
- Failure: `{ data: null, error: <Error>, isLoading: false }`.
- Abort the request in the effect cleanup and ignore the `AbortError`, so a slow response for an old URL never overwrites newer data.

**`App.jsx`** — `UserList` (named export) calls `useFetch('/api/users')` and renders:

- `Loading users...` while loading;
- `<p role="alert">{error.message}</p>` on error;
- otherwise a `<ul>` with one `<li>` per user name.
