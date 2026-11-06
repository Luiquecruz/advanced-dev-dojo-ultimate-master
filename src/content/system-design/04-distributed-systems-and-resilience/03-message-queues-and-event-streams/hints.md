Receiving must not remove the message: that is at-most-once delivery, and a crash loses it. Keep every message in one array, in send order, with a `visibleAt` time and a `receiveCount`; only `ack` and dead-lettering remove it.
---
`receive()` looks for the first message with `visibleAt <= now()`. Delivering it means `receiveCount += 1` and `visibleAt = now() + visibilityTimeoutMs`. Return a copy with `{ id, body, receiveCount }` so callers cannot change the stored state.
---
Before delivering, check `receiveCount >= maxReceives`: such a message is `splice`d out, pushed to the dead letters, and the search repeats until it finds a deliverable message or none is visible.
---
The consumer keeps a `Set` of ids. Return `false` when the id is in it; otherwise call the handler first and add the id only after it returns, so a throw leaves the id unrecorded.
