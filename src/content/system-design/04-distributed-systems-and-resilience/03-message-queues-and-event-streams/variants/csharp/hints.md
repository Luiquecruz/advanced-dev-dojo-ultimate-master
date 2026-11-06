Receiving must not remove the message: that is at-most-once delivery, and a crash loses it. Keep every message in one list, in send order, with a `VisibleAt` time and a `ReceiveCount`; only `Ack` and dead-lettering remove it. `QueueMessage` is an immutable record, so store each message in a small private class whose `ReceiveCount` and `VisibleAt` properties can change.
---
`Receive()` looks for the first message with `VisibleAt <= now()` (`FindIndex` returns its position, or `-1`). Delivering it means `ReceiveCount += 1` and `VisibleAt = now() + visibilityTimeoutMs`. Return a `new QueueMessage(...)` built from the stored values, so callers never hold the queue's own state.
---
Before delivering, check `ReceiveCount >= maxReceives`: such a message is removed with `RemoveAt`, added to the dead letters, and the search repeats until it finds a deliverable message or none is visible.
---
The consumer keeps a `HashSet<string>` of ids. Return `false` when the id is in it; otherwise call the handler first and add the id only after it returns, so an exception leaves the id unrecorded.
