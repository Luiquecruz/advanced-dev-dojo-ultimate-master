Pipes are standalone too: add `imports: [AsyncPipe]` to `AsyncTicker` before using `{{ ticks$ | async }}`.
---
`takeUntilDestroyed()` is an operator: put it inside `.pipe(...)` before `.subscribe(...)`.
---
The constructor is an injection context, so `takeUntilDestroyed()` needs no argument there: `inject(TICKS).pipe(takeUntilDestroyed()).subscribe((value) => this.latest.set(value));`.
