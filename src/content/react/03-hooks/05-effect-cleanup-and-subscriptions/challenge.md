`ChatRoom` leaks resources. Fix both Effects.

Props:

- `roomId`: the room name.
- `createConnection(roomId)`: returns an object with `connect()` and `disconnect()`.

Requirements:

1. **Connection Effect**: create the connection for the current `roomId`, call `connect()`, and return a cleanup that calls `disconnect()`. Switching from `general` to `travel` must produce, in order: `connect general`, `disconnect general`, `connect travel`. Unmounting must disconnect. Add every reactive value the Effect reads to its dependency array.
2. **Online status Effect**: listen to the window `online` and `offline` events, rendering `Online` or `Offline` in the `<p>`. Remove both listeners in the cleanup.
3. Inside `<React.StrictMode>`, exactly **one** connection must remain open after mounting.

Keep the `<h2>Welcome to #{roomId}</h2>` heading.
