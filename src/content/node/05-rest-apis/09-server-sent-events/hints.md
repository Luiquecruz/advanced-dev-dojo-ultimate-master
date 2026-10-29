`formatSSE` builds an array of lines and joins them: optional `event: ...`, then `message.data.split('\n')` mapped to `data: ...`, optional `id: ...`, and finally `` `${lines.join('\n')}\n\n` ``.
---
Decide the status before streaming: look the job up with `jobs.get(c.req.param('id'))` and `return c.json({ error: 'Job not found' }, 404)` when it is missing. Only then `return streamSSE(c, async (stream) => { ... })`.
---
Inside the callback, loop with `for (const [index, percent] of job.steps.entries())`, `continue` when `index <= lastEventId` (from `Number(c.req.header('Last-Event-ID') ?? -1)`), then `await stream.writeSSE({ event: 'progress', id: String(index), data: JSON.stringify({ percent }) })` and `await options.wait(options.intervalMs)`. After the loop, write the `done` event.
