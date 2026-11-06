Receiving must not remove the message: that is at-most-once delivery, and a crash loses it. Keep every message in one list, in send order, as a dict with a `visible_at` time and a `receive_count`; only `ack` and dead-lettering remove it.
---
`receive()` looks for the first message with `visible_at <= now()`. Delivering it means `receive_count += 1` and `visible_at = now() + visibility_timeout_ms`. Return a new dict with only `id`, `body` and `receive_count`, so callers cannot change the stored state.
---
Before delivering, check `receive_count >= max_receives`: such a message is removed from the list, appended to the dead letters, and the search goes on until it finds a deliverable message or none is visible. Loop over a copy (`list(self._messages)`) when you remove items while searching.
---
The consumer keeps a `set` of ids. Return `False` when the id is in it; otherwise call the handler first and add the id only after it returns, so an exception leaves the id unrecorded.
