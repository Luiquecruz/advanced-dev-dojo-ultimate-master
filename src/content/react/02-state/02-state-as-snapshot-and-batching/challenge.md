`ScoreBoard` has two bugs caused by state snapshots. Fix them with **updater functions**.

The component shows `<p>Score: N</p>` (starts at `0`) and three buttons:

1. **`+1`** adds 1 to the score (already works).
2. **`+3`** must add **3** to the score. It currently calls `setScore(score + 1)` three times and only adds 1. Keep three separate calls of `+1` each, but make them add up.
3. **`Bonus later`** schedules a `setTimeout` of **100 ms** that adds **1**. Clicking it twice quickly must add **2** once both timers finish (currently it adds 1).

Use the form `setScore((previous) => ...)` for the `+3` and `Bonus later` updates.
