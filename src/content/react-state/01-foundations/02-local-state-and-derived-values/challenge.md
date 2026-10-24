`NotificationsPanel` receives a `notifications` prop (the server data: `{ id, title, read }`) and lets the user mark items as read **locally**. It "works" on first load, but it copies the prop into state, keeps two derived values in state synced by Effects, and stores a copy of the selected object. Fix it.

Keep the markup and the exports (`sampleNotifications`, `NotificationsPanel`, default `App`). The tests rely on:

- `<span data-testid="unread-count">` with `{n} unread`.
- The filter buttons `All` and `Unread`.
- One `<li>` per visible notification containing a button with the notification title (selects it) and, while unread, a button labelled `Mark {title} as read`.
- A `Mark all as read` button.
- `<p data-testid="details">` showing `{title} (read)`, `{title} (unread)` or `Nothing selected`.

Requirements:

1. Do not copy `notifications` into state. Keep only `filter`, a **`Set` of ids marked as read** and the **selected id**. A notification is read when `notification.read` is `true` **or** its id is in the set.
2. Compute the unread count, the visible list and the selected notification **during render**. Remove both `useEffect` calls.
3. Notifications added or removed by the parent show up immediately. If the selected notification disappears, the details show `Nothing selected`.
4. Switching the filter must produce **a single commit** (the tests count commits with `<Profiler>`).
5. `Mark all as read` marks every current notification as read.
