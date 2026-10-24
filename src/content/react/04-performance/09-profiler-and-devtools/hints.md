`Profiler` is imported from `react` and takes two props: a string `id` and an `onRender` callback. Wrap each section separately so each gets its own id.
---
`onRender` receives positional arguments. Keep the first three: `entries.push({ id, phase, actualDuration })`.
---
In `summary`, loop over `entries`, create `{ mount: 0, update: 0 }` the first time you see an id (`result[id] ??= ...`), then increment `mount` when `phase === 'mount'` and `update` otherwise.
