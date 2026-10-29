1. List the states: running, shutting down (draining), exited. Every signal after the first must see "shutting down" and do nothing new, so store the in-progress promise and return it.
2. Flip the flag first, before any `await`, so readiness checks fail immediately and new work is refused.
3. Start a safety timer before waiting for anything. Unref it so it never keeps the process alive, and route both outcomes (timeout and success) through one guarded `finish` so `exit` runs once.
4. Promisify `server.close`: its callback is the signal that every in-flight request has finished, which is exactly what "drain" means.
5. Run cleanup only after the server is closed (handlers still in flight may need the database), then exit with 0.
6. Treat any failure in closing or cleanup as an unclean exit with code 1, and always clear the timer in `finally`.
7. Wire the OS signals last, through `process.on`, so the same `shutdown` can also be called directly (tests, admin endpoints, the demo).
