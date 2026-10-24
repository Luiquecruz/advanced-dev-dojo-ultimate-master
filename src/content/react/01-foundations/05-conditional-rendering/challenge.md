`Inbox` has a bug: with an empty inbox it shows a stray **`0`** on the screen. Rewrite its conditional rendering so it follows these rules.

The component receives `isLoggedIn` (boolean) and `messages` (array of strings).

1. When `isLoggedIn` is `false`, render **only** `<p>Please sign in.</p>` (use an early return).
2. When logged in, render a `<section>` that contains an `<h2>` with the text `Inbox` and:
   - if there are **no** messages: `<p>No new messages</p>`. No digit may appear anywhere on screen.
   - if there is **one** message: `<p>You have 1 unread message</p>`.
   - if there are **N > 1** messages: `<p>You have N unread messages</p>`.
3. Inside the `<h2>`, after the text, render `<span className="badge">{count}</span>` **only** when there is at least one message.
