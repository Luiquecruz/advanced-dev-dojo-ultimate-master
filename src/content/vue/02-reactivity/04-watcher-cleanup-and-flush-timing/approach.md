1. In the query watcher, create an `AbortController` and register `controller.abort()` with `onWatcherCleanup` before awaiting anything.
2. Pass the controller's signal to `fetch` and swallow only `AbortError` rejections.
3. Notice that the cleanup now runs both before the next query and when the component unmounts.
4. Add `{ flush: 'post' }` to the results watcher so it reads the DOM after the re-render.
