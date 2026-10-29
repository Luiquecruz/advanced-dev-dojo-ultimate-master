Stream job progress with Server-Sent Events. The starter exports the `jobs` map (`id → { steps: number[] }`), `formatSSE` and `createApp(options)`.

**Part 1: the wire format**

`formatSSE({ event?, id?, data })` returns one SSE block as a string, in this order:

1. `event: <event>` when `event` is present
2. one `data: <line>` per line of `data` (split on `\n`)
3. `id: <id>` when `id` is present
4. an empty line (the block ends with `\n\n`)

`formatSSE({ event: 'progress', id: '1', data: '{"percent":50}' })` is `'event: progress\ndata: {"percent":50}\nid: 1\n\n'`.

**Part 2: the endpoint**

`createApp({ wait, intervalMs })` returns a Hono app with `GET /jobs/:id/events`:

1. Unknown job: `404 { "error": "Job not found" }` as JSON (not a stream).
2. Known job: a `streamSSE` response (`text/event-stream`) that, for each step at index `i`, writes an event `progress` with `id: String(i)` and `data: JSON.stringify({ percent: step })`, then `await wait(intervalMs)`.
3. After the progress events, write one event `done` with `data: JSON.stringify({ jobId })` and no `id`, then end the stream.
4. When the request has a `Last-Event-ID` header, skip the steps whose index is less than or equal to it (resume after a reconnect).
