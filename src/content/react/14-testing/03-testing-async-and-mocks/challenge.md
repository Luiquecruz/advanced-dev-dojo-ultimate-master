Make `UserDirectory` robust enough to survive its test suite. Both exports live in `App.jsx`.

### `fetchUsers()` (named export)

- `GET /api/users` and resolve with the parsed JSON array.
- If the response is not OK (for example a `500`), **reject** with an `Error` whose message is `Request failed: <status>` (e.g. `Request failed: 500`).

### `UserDirectory({ onSelect })` (named export)

- While loading, show the text `Loading users...`.
- On success, render a `<ul>` with one `<li>` per user. Inside each `<li>`, a `<button>` showing the user's `name`. Clicking it calls `onSelect(user)` with the full user object.
- On failure, hide the loading text and show `Could not load users.` in an element with `role="alert"`, plus a `<button>` named `Retry` that loads the users again (showing `Loading users...` meanwhile).

Tests replace the API with `mockApi` to simulate failures, and pass `fn()` mocks as `onSelect`.
