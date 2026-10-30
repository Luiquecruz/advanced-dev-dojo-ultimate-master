`App.jsx` is a legacy **class container** that fetches `/api/users`, filters them and renders the markup, all in one place. Split it into a custom hook and a presentational component **without changing what the user sees**.

**`hooks/useUserDirectory.js`**

- `useUserDirectory()` returns `{ status, users, query, setQuery }`.
- `status` starts as `'loading'` and becomes `'success'` after `GET /api/users`, or `'error'` when the request fails (non-ok response).
- `users` is the loaded list filtered by `query`: case-insensitive match on `name`, ignoring surrounding spaces in the query. It is derived, not stored. While loading or after an error it is `[]`.
- `query` starts as `''`; `setQuery(value)` updates it.

**`components/UserDirectory.jsx`**

- `UserDirectory({ status, users, query, onQueryChange })` renders **from props only**: no `fetch`, no `useState`, no `useEffect`.
- A `Filter users` labelled input with `value={query}`; typing calls `onQueryChange(newValue)`.
- `status === 'loading'`: the text `Loading users...`. `status === 'error'`: `Could not load users` with `role="alert"`. `status === 'success'`: a `<ul aria-label="Users">` with one `<li>` per user, `{name} ({role})`.
- Keep the `<section aria-label="User directory">` and the `Team` heading.

**`App.jsx`**

- A function component that calls `useUserDirectory()` and renders `<UserDirectory />`, passing `setQuery` as `onQueryChange`. No class, no `fetch`.

Tests render `UserDirectory` directly with fake props (and fail if it touches the network) and test the hook with `renderHook`.
