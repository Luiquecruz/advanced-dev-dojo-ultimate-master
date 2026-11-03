Give a support chat a conversation memory: a token-budgeted sliding window plus a running summary written by the model. The system prompt and the latest messages are always sent, older messages are folded into the summary, and a failed summary never loses history.

Messages are `{ role, content }` objects (the `Message` type of `@dojo/ai`). Measure tokens with `countTokens(messages)` from `@dojo/ai`. The model is passed in; the tests use `createModel()`.

## 1. `buildContext({ system, summary, history, maxTokens, keepRecent })`

Returns `{ messages, overflow }`:

- `messages` starts with `{ role: 'system', content: system }`. When `summary` is not empty, a second system message follows, whose content is `SUMMARY_PREFIX` (exported, already in the starter), a space, and the summary.
- Then come the **latest** messages of `history`, in order: always at least the last `keepRecent` (all of them when the history is shorter), plus as many older messages as fit, adding them from newest to oldest while `countTokens(messages)` stays at most `maxTokens`. Stop at the first message that does not fit: the kept messages are one unbroken run that ends with the newest message.
- `overflow` is every message of `history` that was not kept, in order. `overflow` followed by the kept messages equals `history`.

## 2. `summarize(model, previousSummary, messages, maxTokens = 300)`

Make **one** `model.generate` call with `maxTokens` set, whose messages contain the previous summary (when not empty) and the content of every message in `messages` (for example, a system message with summarizer instructions and a user message with `role: content` lines).

Return the reply text, trimmed, when the call succeeds with `finishReason` `'stop'` and the trimmed text is not empty. Return `undefined` (never throw) when the call throws, refuses, is filtered, is truncated (`'length'`) or is empty.

## 3. `createConversationMemory({ model, system, maxTokens, keepRecent, summaryMaxTokens = 300 })`

Returns an object that starts with an empty summary and history:

- `add(message)` appends a message to the history.
- `context()` returns the `messages` of `buildContext` for the current summary and history.
- `compact()` computes the overflow. With no overflow it returns `{ folded: 0, summarized: false }` and calls no model. Otherwise it calls `summarize(model, summary, overflow, summaryMaxTokens)`:
  - on success, the result becomes the summary, the overflow messages are removed from the history, and it returns `{ folded: overflow.length, summarized: true }`;
  - on failure, summary and history stay exactly as they were, and it returns `{ folded: 0, summarized: false }`.
- `state()` returns `{ summary, history }` (a copy of the history).

The tests check budgets with `countTokens`, which messages are kept, what the summary request contains, and that history survives every kind of summary failure across seeds; never the summary's wording.
