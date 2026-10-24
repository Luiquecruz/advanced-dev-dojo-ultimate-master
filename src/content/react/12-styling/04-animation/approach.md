1. Write `subscribe(onChange)`: get the `MediaQueryList`, add a `change` listener, return the cleanup.
2. Implement `usePrefersReducedMotion` with `useSyncExternalStore`, a client snapshot reading `.matches` and a server snapshot of `false`.
3. In `FadePanel`, keep a `mounted` state initialized from `open`; the DOM node exists while `mounted` is true.
4. When `open` turns true, set `mounted` during render so reopening cancels an exit in progress.
5. When `open` is false, render `data-state="closed"` and `fade-out`, and unmount in `onAnimationEnd`.
6. If reduced motion is on, skip the animation: set `mounted` to false as soon as `open` becomes false.
