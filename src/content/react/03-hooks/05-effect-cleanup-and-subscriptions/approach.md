1. In the connection Effect, keep the `connection` in a local variable and return `() => connection.disconnect()`. The cleanup closes over the connection of that run, so it disconnects the old room.
2. Replace `[]` with `[roomId, createConnection]`: when the room changes, React runs the old cleanup and then the new setup.
3. Unmount now triggers the cleanup automatically.
4. In the online Effect, name the handlers inside the Effect so the same references are used by `addEventListener` and `removeEventListener`.
5. Return a cleanup that removes both listeners.
6. StrictMode's extra setup, cleanup, setup cycle now leaves exactly one connection and one pair of listeners.
