# Server-Sent Events

Some responses are not one value but a sequence: job progress, notifications, live prices, and every LLM chat answer you have seen appear token by token. **Server-Sent Events (SSE)** stream those updates over a plain HTTP response that stays open. The browser has a built-in client, `EventSource`, with automatic reconnection.

## The wire format

An SSE response has `Content-Type: text/event-stream` and a body made of text blocks separated by a blank line:

```text
event: progress
data: {"percent":25}
id: 0

event: progress
data: {"percent":50}
id: 1

event: done
data: {"jobId":"report-1"}

```

| Field | Meaning |
| --- | --- |
| `data:` | The payload. Several `data:` lines are joined with `\n` by the client |
| `event:` | Event name; the client listens with `addEventListener(name)` (default `message`) |
| `id:` | Last event id; the browser sends it back as `Last-Event-ID` when it reconnects |
| `retry:` | Reconnection delay in milliseconds |
| `: text` | A comment, used as a heartbeat to keep proxies from closing idle connections |

The format is so simple you can write it yourself, which is a good way to understand what libraries produce.

## Streaming with Hono

```ts
import { streamSSE } from 'hono/streaming';

app.get('/jobs/:id/events', (c) => {
  return streamSSE(c, async (stream) => {
    stream.onAbort(() => console.log('client disconnected'));
    for (const percent of [25, 50, 75, 100]) {
      await stream.writeSSE({ event: 'progress', data: JSON.stringify({ percent }) });
      await stream.sleep(500);
    }
  });
});
```

`streamSSE` returns the `Response` immediately with the right headers; the callback keeps writing into it, and the response ends when the callback finishes. Checks that decide the status (`404`, `401`) must happen **before** you call `streamSSE`: once streaming starts, the status line has been sent.

In tests and real code, inject the waiting function rather than sleeping for real: the stream logic stays the same, the tests stay fast.

## Consuming it on the frontend

```ts
const source = new EventSource('/jobs/report-1/events');
source.addEventListener('progress', (event) => setPercent(JSON.parse(event.data).percent));
source.addEventListener('done', () => source.close());
```

`EventSource` reconnects automatically and sends `Last-Event-ID`, so the server can resume instead of replaying everything. Its limits: `GET` only and no custom headers (authenticate with cookies). LLM APIs stream SSE in answer to a `POST`, so their clients read `fetch(...).body` with a reader and parse the blocks manually.

## Resuming after a disconnect

Give each event a monotonic `id` and read the header on reconnect:

```ts
const lastId = Number(c.req.header('Last-Event-ID') ?? -1);
const pending = events.filter((event) => event.id > lastId);
```

Without ids, a mobile client that loses its connection either misses events or receives duplicates.

## Production pitfalls

- **Buffering proxies**: Nginx and some CDNs buffer responses, so events arrive in one burst at the end. Disable buffering for the route (`X-Accel-Buffering: no`) and check your platform's streaming support.
- **Idle timeouts**: load balancers close quiet connections after 30–120 s; send a heartbeat comment periodically.
- **Connection limits**: on HTTP/1.1 browsers allow about 6 connections per origin, shared by all tabs. HTTP/2 removes the practical limit.
- **Cleanup**: stop timers and unsubscribe from event sources in `onAbort`, otherwise every closed tab leaks work on the server.
- **Serverless**: many platforms cap response duration; long-lived streams need a runtime that supports them.
- **Many instances**: an event produced on instance A must reach clients connected to instance B; that needs a broker (Redis pub/sub, a queue), covered in the scaling module.

## When to choose it

| Need | Choose |
| --- | --- |
| Server → client updates (progress, notifications, AI token streams) | **SSE**: plain HTTP, automatic reconnect, works through most infrastructure |
| Bidirectional, low-latency messages (chat with typing, multiplayer, collaborative editing) | **WebSockets** |
| Updates every few minutes, or infrastructure that cannot hold connections | **Polling** with caching |
| Managed fan-out to thousands of clients | A hosted service (Pusher, Ably, Supabase Realtime) |

SSE is the simplest real-time option and the right default whenever the client mostly listens.

## Working with AI

Ask for "an SSE endpoint with `streamSSE`, event names, numeric ids, `Last-Event-ID` resume, heartbeat and cleanup in `onAbort`, with validation and 404 before the stream starts". Review checklist:

- Errors that need a status are answered before `streamSSE`.
- Each event has an `event` name and an `id`; JSON payloads are `JSON.stringify`-ed into `data`.
- `Last-Event-ID` is honored, or the decision to replay everything is explicit.
- Timers, intervals and subscriptions are cleaned up when the client disconnects.
- No unbounded loops without `await`, which would block the event loop.
- Deployment target supports streaming (no buffering, no short response time cap).
