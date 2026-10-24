Inside one event, `score` never changes: all three `setScore(score + 1)` calls ask for the same value. React needs to know how to go from *the previous queued value* to the next one.
---
Pass a function to the setter: `setScore((previous) => previous + 1)`. React runs queued updaters in order, each receiving the result of the previous one.
---
The timeout has the same problem: its callback closed over `score` from the render where you clicked. Replace the call inside `setTimeout` with `setScore((previous) => previous + 1)`.
