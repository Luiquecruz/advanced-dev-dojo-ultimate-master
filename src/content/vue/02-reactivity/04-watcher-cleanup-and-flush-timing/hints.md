At the top of the query watcher: `const controller = new AbortController();` and `onWatcherCleanup(() => controller.abort());`. Both lines must run before the first `await`.
---
Pass `{ signal: controller.signal }` as the second argument of `fetch`, and wrap the request in `try/catch`, ignoring errors whose `name` is `'AbortError'`.
---
The count watcher needs a third argument: `{ flush: 'post' }`. Then it runs after Vue has patched the `<li>` elements.
