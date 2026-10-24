An Effect without a returned function has nothing to undo. Whatever the setup starts, the cleanup must stop, in reverse.
---
The connection Effect reads `roomId` and `createConnection`, so its dependency array should be `[roomId, createConnection]`. Return `() => connection.disconnect()`.
---
`removeEventListener` only works with the same function reference. Create `const handleOnline = () => setIsOnline(true)` (and `handleOffline`) inside the Effect, add both, and remove both in the returned cleanup.
