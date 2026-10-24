1. Separate reactive logic (connect to `roomId`) from non-reactive logic (format the status with the current `theme`).
2. Move the status update into an Effect Event created with `useEffectEvent`; it always reads the latest props.
3. Call the Effect Event from the connection's `'connected'` handler, passing the `roomId` the effect connected to.
4. Reduce the dependency array to `[roomId]`, so theme changes no longer reconnect.
