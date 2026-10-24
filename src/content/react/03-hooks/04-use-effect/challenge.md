Build a `UserCard` that loads a user from the Dojo fake API.

- The component receives a `userId` prop.
- While loading, render the text `Loading...`.
- Fetch `/api/users/{userId}` and render the user's `name` inside an `<h3>`.
- When `userId` changes, fetch again.
- Abort (or ignore) the previous request in the effect cleanup.

The fake API returns `{ id, name, email, role }`. User `1` is **Ada Lovelace**, user `2` is **Alan Turing**.
