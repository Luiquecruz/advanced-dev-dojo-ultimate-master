1. Treat the event stream as a line protocol: a field per line, an empty line as the end of an event. Everything else follows from those two rules.
2. When formatting, the only dangerous character is the line break: inside `Data` it starts a new line, so every line of the payload becomes its own `data:` field; inside `Id` or `Event` it cannot be represented, so reject it.
3. When parsing, model the reader as a small state machine with a data buffer, an event type and a last event id, updated by each field line.
4. Separate field and value at the first colon only, because values such as JSON or URLs contain colons of their own.
5. Dispatch on the empty line, skip empty buffers, and decide which state survives an event: the data and type belong to one event, while the last event id belongs to the connection, which is what lets a client resume with `Last-Event-ID`.
