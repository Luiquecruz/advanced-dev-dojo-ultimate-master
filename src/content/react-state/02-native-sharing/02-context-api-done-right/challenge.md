The editor's notification system is built on context, but it breaks every rule: a no-op default value, an unguarded hook, a new value object on every render, unstable functions, stale updates and the legacy `.Provider` syntax. On top of that, **the `Save draft` button does nothing** and nobody gets an error. Fix the module.

Keep the exports `NotificationsProvider`, `useNotifications`, `NotificationList` and the default `App`.

1. Create the context with **`null`** as the default.
2. `useNotifications()` reads the context (with `use` or `useContext`) and **throws an `Error`** whose message contains `NotificationsProvider` when there is no provider.
3. `NotificationsProvider` exposes `{ notifications, notify, dismiss }`:
   - `notify(message, type = 'info')` appends `{ id, message, type }`; several calls in the same event must all be kept.
   - `dismiss(id)` removes that notification.
   - `notify` and `dismiss` keep **the same identity** across renders, and the value object only changes when `notifications` changes.
4. Render the provider with the React 19 syntax `<NotificationsContext value={...}>`.
5. Fix `App` so the header buttons can notify: clicking `Save draft` shows `Draft saved` in the `Notifications` list.

`NotificationList` (already done) renders `<ul aria-label="Notifications">` with one `<li className="toast toast-{type}">` per notification and a `Dismiss {message}` button.
