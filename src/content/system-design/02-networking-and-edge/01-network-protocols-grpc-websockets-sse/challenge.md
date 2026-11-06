Write both ends of a Server-Sent Events stream: the server side that turns a message into a `text/event-stream` frame, and the client side that reads a stream back into events, the job the browser's `EventSource` does for you. Both are pure functions over strings, with no network.

```ts
interface SseMessage { id?: string; event?: string; data: string; retry?: number }
interface SseEvent { event: string; data: string; lastEventId: string }

export function formatEvent(message: SseMessage): string
export function parseEvents(stream: string): SseEvent[]
```

**`formatEvent`** writes these lines, each ending with `\n`, in this order, and then one empty line (`\n`) that ends the event:

1. `id: <id>` when `id` is given;
2. `event: <event>` when `event` is given;
3. `retry: <retry>` when `retry` is given (the reconnection delay in milliseconds);
4. one `data: <line>` per line of `data`, splitting `data` on `\n` (so `''` gives a single `data: ` line).

A line break inside `id` or `event` would corrupt the stream: throw an `Error` with the message `id and event must not contain line breaks` when either contains `\n`.

**`parseEvents`** implements this subset of the HTML specification's event stream rules. Lines are separated by `\n` only. (The full specification also ends a line at `\r\n` or a lone `\r`; production code must split on those too and reject them in `id` and `event`.)

- A line starting with `:` is a comment and is ignored.
- Any other non-empty line is split at its **first** `:` into a field name and a value; if the value starts with a space, remove that one space. A line without `:` is a field name with the value `''`.
- `data`: append the value and a `\n` to the data buffer. `event`: set the event type. `id`: set the last event id. Every other field (`retry` included) is ignored here.
- An empty line dispatches: if the data buffer is empty, nothing is emitted; otherwise emit `{ event, data, lastEventId }`, where `event` is the event type or `'message'` when none was set, and `data` is the buffer without its final `\n`. Then, whether or not an event was emitted, clear the data buffer and the event type. The last event id is **not** cleared: it carries over to later events until another `id` line changes it (it starts as `''`).
- Text after the last empty line is an incomplete event and is discarded.
