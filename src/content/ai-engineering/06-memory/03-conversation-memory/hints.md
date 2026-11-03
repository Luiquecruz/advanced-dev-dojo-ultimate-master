Start with `buildContext`, the pure part. Build a `head` array (the system message, then the summary message when there is one). The kept messages are a suffix of `history`, so all you need is the index where that suffix starts.
---
Begin with `start = history.length - Math.min(keepRecent, history.length)`, which keeps the mandatory recent messages. Then move `start` one step left while `start > 0` and `countTokens([...head, ...history.slice(start - 1)])` is still within `maxTokens`. `messages` is `[...head, ...history.slice(start)]` and `overflow` is `history.slice(0, start)`.
---
`summarize` wraps one `generate` call in `try/catch`: the catch returns `undefined`. After the call, return `response.text.trim()` only when `finishReason === 'stop'` and the trimmed text is not empty. Put the previous summary and every `role: content` line in the user message.
---
In `compact`, compute the overflow from the current state, return early when it is empty, then `await summarize(...)`. Only when the result is a string do you assign the new summary and set `history = history.slice(overflow.length)`. Removing the prefix by its length is safe even if a message was added while the summary call was running.
