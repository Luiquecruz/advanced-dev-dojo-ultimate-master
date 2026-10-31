Split the work into two small helpers that both functions share: one that builds the request from the input (messages plus an optional `maxTokens`), and one that maps a finish reason to a status. Then `complete` is a single `generate` call plus a result object.
---
Build the messages as a list that starts empty, push the system message only when `system` is defined, then always push the user message. For the status: `length` is truncated, `refusal` and `content_filter` are refused, anything else is complete. Copy `text`, `finishReason` and `usage` from the response as they are.
---
For streaming, loop over `model.stream(request)` with `for await`. Keep three variables (`text`, `finishReason`, `usage`): on a `text` chunk append the delta and call `onDelta(delta)`; on the `finish` chunk store its finish reason and usage. After the loop, return the same shape as `complete`, using the status helper.
