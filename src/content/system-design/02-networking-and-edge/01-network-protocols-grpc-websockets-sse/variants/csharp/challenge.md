Write both ends of a Server-Sent Events stream: the server side that turns a message into a `text/event-stream` frame, and the client side that reads a stream back into events, the job the browser's `EventSource` does for you. Both are pure static methods over strings, with no network.

```csharp
public record SseMessage(string Data, string? Id = null, string? Event = null, int? Retry = null);
public record SseEvent(string Event, string Data, string LastEventId);

public static class Sse
{
    public static string FormatEvent(SseMessage message);
    public static IReadOnlyList<SseEvent> ParseEvents(string stream);
}
```

**`FormatEvent`** writes these lines, each ending with `\n`, in this order, and then one empty line (`\n`) that ends the event:

1. `id: <Id>` when `Id` is not `null`;
2. `event: <Event>` when `Event` is not `null`;
3. `retry: <Retry>` when `Retry` is not `null` (the reconnection delay in milliseconds);
4. one `data: <line>` per line of `Data`, splitting `Data` on `'\n'` (so `""` gives a single `data: ` line).

A line break inside `Id` or `Event` would corrupt the stream: throw an `ArgumentException` whose `Message` is exactly `id and event must not contain line breaks` when either contains `'\n'`.

**`ParseEvents`** implements this subset of the HTML specification's event stream rules. Lines are separated by `\n` only. (The full specification also ends a line at `\r\n` or a lone `\r`; production code must split on those too and reject them in `id` and `event`.)

- A line starting with `:` is a comment and is ignored.
- Any other non-empty line is split at its **first** `:` into a field name and a value; if the value starts with a space, remove that one space. A line without `:` is a field name with the value `""`.
- `data`: append the value and a `\n` to the data buffer. `event`: set the event type. `id`: set the last event id. Every other field (`retry` included) is ignored here.
- An empty line dispatches: if the data buffer is empty, nothing is emitted; otherwise emit `new SseEvent(Event, Data, LastEventId)`, where `Event` is the event type or `"message"` when none was set, and `Data` is the buffer without its final `\n`. Then, whether or not an event was emitted, clear the data buffer and the event type. The last event id is **not** cleared: it carries over to later events until another `id` line changes it (it starts as `""`).
- Text after the last empty line is an incomplete event and is discarded.
