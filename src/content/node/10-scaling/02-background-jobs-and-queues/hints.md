`drain()` is the scheduler: `while (this.running < this.concurrency && this.head < this.waiting.length)` take `this.waiting[this.head++]` and call `this.run(job)` without awaiting it. After the loop, if `this.isIdle()`, resolve and clear every function in `idleWaiters`.
---
`run(job)` starts with `this.running++` and `job.attempts++`, then `await this.handler(job.data, job)` inside `try`. On success push the job to `completed`. Put `this.running--` and `this.drain()` in `finally`, so a slot is freed whatever happens.
---
In `catch`, store `job.error = error.message`. If `job.attempts < this.maxAttempts`, increment `this.scheduled` and `setTimeout(() => { this.scheduled--; this.waiting.push(job); this.drain(); }, this.retryDelay(job.attempts))`; otherwise push the job to `failed`. Counting scheduled retries is what keeps `onIdle` from resolving too early.
