Both functions treat the stream as lines. In `formatEvent`, a line break inside `data` would end the field early, so every line of the payload needs its own `data:` field; a line break inside `id` or `event` has no safe encoding, so reject it before writing anything.
---
In `parseEvents`, keep three variables outside the loop: the data buffer, the event type and the last event id. `stream.split('\n')` gives the lines; the piece after the final `\n` is never followed by an empty line, so it can never dispatch.
---
`message.data.split('\n')` gives the payload lines, and `includes('\n')` checks `id` and `event`. For a field line, `indexOf(':')` finds the first colon: the field is what comes before it, the value what comes after, minus one leading space. On an empty line, emit only when the buffer is not empty, use `data.slice(0, -1)` to drop the final `\n`, then reset the buffer and the event type in both cases, but never the last event id.
