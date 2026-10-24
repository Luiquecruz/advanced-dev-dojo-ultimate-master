The `Dashboard` has a click counter and a `UserList`. Every click re-renders the whole list even though the users never changed. Make the list skip those renders.

- Keep the named export `UserList`, but export it **wrapped in `memo`** (`export const UserList = memo(function UserList(...) {...})`).
- `UserList` receives `users`, `options` and `onRender`. It must keep rendering one `<li>` per user with the name and, when `options.showEmail` is true, the email in parentheses.
- `Dashboard` (default export) receives `users` and `onListRender` and forwards `onListRender` to `UserList` as `onRender`. The tests use it to **count renders**.
- The button text stays `Clicks: {n}`.
- Clicking the button must **not** re-render `UserList`. Passing a **new** `users` array must re-render it.

Watch out: `memo` compares props with `Object.is`. An object literal written inline in JSX is a brand new object on every render.
