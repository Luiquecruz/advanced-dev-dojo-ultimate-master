Both components read numbers from the `TICKS` token (an `Observable<number>`; it defaults to `interval(1000)`, tests replace it with a Subject).

**`AsyncTicker`** (selector `app-async-ticker`)

1. Expose `ticks$ = inject(TICKS)` and render `<p>Async: N</p>` using the `async` pipe (import `AsyncPipe`).
2. Do not call `subscribe()` in this component.

**`ManualTicker`** (selector `app-manual-ticker`)

1. In the constructor, subscribe to `inject(TICKS)` and store each value in the `latest` signal (starts at `0`), rendered as `<p>Manual: N</p>`.
2. Use `takeUntilDestroyed()` so the subscription ends when the component is destroyed.

Both components must leave no active subscription on the source after they are destroyed.
