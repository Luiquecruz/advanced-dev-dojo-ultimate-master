1. Recognize the bug: `score` is a snapshot constant for the current render, so repeated `setScore(score + 1)` calls all request the same value.
2. In `addThree`, replace each call with `setScore((previous) => previous + 1)` so the queue produces `+1`, `+1`, `+1`.
3. In `addBonusLater`, use the same updater inside the timeout so it reads the latest state when it fires, not the stale snapshot.
4. Leave `addOne` alone or convert it too; a single update from a click is correct either way.
