Fix `ChatRoom` so the theme never causes a reconnection but notifications still use the **latest** theme.

The starter includes `chatServer`, a fake server that records `'connect:{roomId}'` and `'disconnect:{roomId}'` in `chatServer.log`. A connection fires its `'connected'` handlers 50 ms after `connect()`.

`ChatRoom({ roomId, theme })`, the default export, must:

1. Connect to `roomId` in an effect and disconnect in the cleanup. The effect depends on `[roomId]` only.
2. When the connection fires `'connected'`, set the status text to `Connected to {roomId} ({theme} theme)` using the theme **at the moment the event fires**.
3. Render the status in `<p role="status">` (initially `Connecting...`).

Use `useEffectEvent` for the `'connected'` handler. Changing `theme` must not disconnect or reconnect.
