Start with `build_context`, the pure part. Build a `head` list (the system message, then the summary message when there is one). The kept messages are a suffix of `history`, so all you need is the index where that suffix starts.
---
Begin with `start = len(history) - min(keep_recent, len(history))`, which keeps the mandatory recent messages. Then move `start` one step left while `start > 0` and `count_tokens(head + history[start - 1:])` is still within `max_tokens`. `"messages"` is `head + history[start:]` and `"overflow"` is `history[:start]`.
---
`summarize` wraps one `generate` call in `try/except Exception`: the handler returns `None`. After the call, return `response["text"].strip()` only when `response["finishReason"] == "stop"` and the stripped text is not empty. Put the previous summary and every `role: content` line in the user message.
---
In `compact`, compute the overflow from the current state, return early when it is empty, then `await summarize(...)`. Only when the result is not `None` do you assign the new summary and set `self.history = self.history[len(overflow):]`. Removing the prefix by its length is safe even if a message was added while the summary call was running.
