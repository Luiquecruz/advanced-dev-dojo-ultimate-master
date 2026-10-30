1. Start from the contract. The shell knows only `load`, `mount(element, props)` and the returned `unmount`; it never imports React or any micro-frontend's internals, so each team can pick its own stack.
2. Route matching is the shell's job: compare the path with each registered route (equal, or route plus `/`), so deep links inside a micro-frontend still reach it.
3. Lifecycle discipline: before mounting the next micro-frontend, call the previous `unmount` and clear the container. Skipping `unmount` leaks React roots, timers and listeners even though the DOM looks empty.
4. Give every micro-frontend its own element (`section[data-micro-frontend]`), the only DOM it may touch, which also gives the shell a place to show a fallback.
5. Cache the `load()` promise per name: remote bundles download once, revisits mount instantly, and concurrent navigations share the request. Evict on failure to allow a retry.
6. Isolate failures with `try/catch` around both load and mount, and guard against stale navigations with a counter so a slow load never mounts over a newer page.
7. Communicate through the platform: micro-frontends request navigation with a `window` `CustomEvent`, the shell listens, and `destroy()` removes the listener so a torn-down shell leaves nothing behind.
