1. Inject the legacy service and convert its `users$` with `toSignal` and `requireSync`.
2. Derive `count` and `filtered` with `computed`, lowercasing both sides for the match.
3. Delegate `add` to the legacy service so it keeps owning the writes.
4. Subscribe to `added$` in the constructor with `takeUntilDestroyed()` and push names into `added`.
