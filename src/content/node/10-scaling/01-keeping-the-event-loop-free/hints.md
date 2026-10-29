`processInChunks` is two nested loops: the outer one moves `start` by `chunkSize`, the inner one runs `worker(items[index], index)` from `start` to `Math.min(start + chunkSize, items.length)`. After the inner loop, yield only if there are items left (`end < items.length`).
---
The monitor keeps one variable, `expected = now() + intervalMs`. In each `setInterval` tick, read `current = now()`, push `Math.max(0, current - expected)`, then set `expected = current + intervalMs`. Call `timer.unref()` right after creating the interval, and `clearInterval(timer)` in `stop`.
---
`maxLag` can be `lags.reduce((max, lag) => Math.max(max, lag), 0)`, which also gives `0` when nothing was recorded. `shedLoad` returns a new `(req, res) => {}` that checks `options.currentLag() > options.maxLagMs` first: if so, `res.writeHead(503, { 'Content-Type': 'application/json', 'Retry-After': '1' })` and `res.end(JSON.stringify({ error: 'Server overloaded' }))`, then `return`; otherwise `handler(req, res)`.
