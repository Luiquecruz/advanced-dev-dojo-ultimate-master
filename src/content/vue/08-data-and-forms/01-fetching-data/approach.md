1. Register a watcher on `userId` with `immediate: true` so the first page of data loads on mount.
2. At the top of the callback, create an `AbortController` and register `controller.abort()` with `onWatcherCleanup` (call it before any `await`).
3. Reset `loading`/`error`, `await fetch(...)` with the signal, throw when `!response.ok`, and assign the parsed JSON to `posts`.
4. In `catch`, return early when the controller was aborted; otherwise clear the posts and set the error message.
5. Turn `loading` off and render the states with a `v-if` / `v-else-if` / `v-else` chain.
