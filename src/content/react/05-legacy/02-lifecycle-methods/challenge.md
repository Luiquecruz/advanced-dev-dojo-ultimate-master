`UserProfile` is a class component that loads a user from `/api/users/{userId}`. It works on the first render, but it has three classic lifecycle bugs. Fix them **without converting it to a function component**.

The component must:

- Render `Loading...` (in a `<p>`) while the user is loading.
- Render the user's `name` in an `<h3>` and `email` in a `<p>` once loaded.
- **Fetch again when the `userId` prop changes** (implement `componentDidUpdate` and compare `prevProps.userId`).
- **Ignore stale responses**: when `userId` changes, abort the previous request so an old, slow response never replaces the newer user.
- **Abort the in-flight request in `componentWillUnmount`.**

Keep `export default class UserProfile extends Component`. The fake API returns `{ id, name, email, role }`. User `1` is Ada Lovelace (`ada@example.com`), user `2` is Alan Turing (`alan@example.com`).
