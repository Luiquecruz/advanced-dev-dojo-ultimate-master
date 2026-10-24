1. Create the effect in the constructor with the `onCleanup` parameter.
2. Read `draft()` first and return early when it's empty.
3. Read the author through `untracked` so it's captured but not tracked.
4. Schedule the save with `setTimeout` using `delayMs`, appending immutably to `saved`.
5. Register `onCleanup(() => clearTimeout(timer))`: Angular calls it before the next run (debounce) and on destroy (cancellation).
