Build an in-memory at-least-once queue with a visibility timeout and a dead-letter list, and the idempotent consumer that makes its duplicate deliveries harmless. Time is injected through `now`, so nothing waits for real.

```csharp
public record QueueMessage(string Id, object? Body, int ReceiveCount);

public class MessageQueue
{
    public MessageQueue(long visibilityTimeoutMs, int maxReceives, Func<long> now);
    public string Send(object? body);
    public QueueMessage? Receive();
    public bool Ack(string id);
    public IReadOnlyList<QueueMessage> DeadLetters();
}

public class IdempotentConsumer
{
    public IdempotentConsumer(Action<object?> handler);
    public bool Handle(QueueMessage message);
}
```

**`new MessageQueue(visibilityTimeoutMs: …, maxReceives: …, now: …)`** starts empty. Each queue has its own messages and ids.

- `Send(body)` stores the message and returns its id: `"m1"`, `"m2"`, ... in send order. A new message is visible immediately.
- `Receive()` delivers the visible message that was **sent first** and returns it as a `QueueMessage`, where `ReceiveCount` counts its deliveries (1 the first time). The message stays in the queue but is hidden until `now()` reaches the receive time plus `visibilityTimeoutMs`; from that instant it is visible again and can be redelivered. Returns `null` when no message is visible.
- Before delivering a message that has already been received `maxReceives` times, `Receive()` moves it to the dead letters instead (keeping its `ReceiveCount`) and continues with the next visible message.
- `Ack(id)` deletes the message for good and returns `true`; it returns `false` when no message with that id is in the queue (already acknowledged, unknown or dead-lettered).
- `DeadLetters()` returns the dead-lettered messages, in the order they were moved.

**`new IdempotentConsumer(handler)`** remembers the ids it has processed. `Handle(message)` calls `handler(message.Body)` and returns `true` the first time it sees `message.Id`, and returns `false` without calling the handler for an id it has already processed. When the handler throws, the exception propagates and the id is **not** recorded, so a redelivery can try again.

The file opens with a small demo that the **Run** button prints.
