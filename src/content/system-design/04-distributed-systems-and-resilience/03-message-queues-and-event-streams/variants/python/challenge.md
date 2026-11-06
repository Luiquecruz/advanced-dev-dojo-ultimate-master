Build an in-memory at-least-once queue with a visibility timeout and a dead-letter list, and the idempotent consumer that makes its duplicate deliveries harmless. Time is injected through `now`, so nothing waits for real.

```python
class Queue:
    def __init__(self, *, visibility_timeout_ms: int, max_receives: int, now: Callable[[], float]): ...
    def send(self, body) -> str: ...
    def receive(self) -> dict | None: ...  # {"id": "m1", "body": ..., "receive_count": 1}
    def ack(self, message_id: str) -> bool: ...
    def dead_letters(self) -> list[dict]: ...

class IdempotentConsumer:
    def __init__(self, handler: Callable[[object], None]): ...
    def handle(self, message: dict) -> bool: ...  # message: {"id": ..., "body": ...}
```

**`Queue(visibility_timeout_ms=..., max_receives=..., now=...)`** starts empty. Each queue has its own messages and ids.

- `send(body)` stores the message and returns its id: `"m1"`, `"m2"`, ... in send order. A new message is visible immediately.
- `receive()` delivers the visible message that was **sent first** and returns `{"id", "body", "receive_count"}`, where `receive_count` counts its deliveries (1 the first time). The message stays in the queue but is hidden until `now()` reaches the receive time plus `visibility_timeout_ms`; from that instant it is visible again and can be redelivered. Returns `None` when no message is visible.
- Before delivering a message that has already been received `max_receives` times, `receive()` moves it to the dead letters instead (keeping its `receive_count`) and continues with the next visible message.
- `ack(message_id)` deletes the message for good and returns `True`; it returns `False` when no message with that id is in the queue (already acknowledged, unknown or dead-lettered).
- `dead_letters()` returns the dead-lettered messages as `{"id", "body", "receive_count"}` dicts, in the order they were moved.

**`IdempotentConsumer(handler)`** remembers the ids it has processed. `handle(message)` calls `handler(message["body"])` and returns `True` the first time it sees `message["id"]`, and returns `False` without calling the handler for an id it has already processed. When the handler raises, the exception propagates and the id is **not** recorded, so a redelivery can try again.

The file ends with a small demo under `if __name__ == "__main__":` that the **Run** button prints.
