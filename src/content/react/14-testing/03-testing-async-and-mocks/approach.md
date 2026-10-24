1. In `fetchUsers`, throw an `Error` with the status when `response.ok` is false; only then return `response.json()`.
2. Add `error` state. In the effect, store the users on success and the error on failure.
3. Render three branches in order: error (alert + Retry), loading, list.
4. Add an `attempt` counter to state and to the effect dependency array; the effect clears `users` and `error` before fetching so the loading text shows again.
5. Clean up with an `ignore` flag so a response that arrives after unmount or a newer attempt is dropped.
6. Wire each user button with `onClick={() => onSelect(user)}`.
