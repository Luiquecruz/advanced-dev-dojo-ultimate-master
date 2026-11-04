Give a support chat a conversation memory: a token-budgeted sliding window plus a running summary written by the model. The system prompt and the latest messages are always sent, older messages are folded into the summary, and a failed summary never loses history.

Messages are dicts `{"role", "content"}` (the message shape of `dojo_ai`). Measure tokens with `count_tokens(messages)` from `dojo_ai`. The model is passed in; the tests use `create_model()`.

## 1. `build_context(system, summary, history, max_tokens, keep_recent)`

Returns a dict `{"messages", "overflow"}`:

- `"messages"` starts with `{"role": "system", "content": system}`. When `summary` is not empty, a second system message follows, whose content is `SUMMARY_PREFIX` (a module constant, already in the starter), a space, and the summary.
- Then come the **latest** messages of `history`, in order: always at least the last `keep_recent` (all of them when the history is shorter), plus as many older messages as fit, adding them from newest to oldest while `count_tokens(messages)` stays at most `max_tokens`. Stop at the first message that does not fit: the kept messages are one unbroken run that ends with the newest message.
- `"overflow"` is every message of `history` that was not kept, in order. `overflow + kept` equals `history`.

## 2. `summarize(model, previous_summary, messages, max_tokens=300)`

Make **one** `await model.generate(request)` call with `"maxTokens"` set, whose messages contain the previous summary (when not empty) and the content of every message in `messages` (for example, a system message with summarizer instructions and a user message with `role: content` lines).

Return the reply text, stripped, when the call succeeds with `"finishReason"` `"stop"` and the stripped text is not empty. Return `None` (never raise) when the call raises (`ModelError`), refuses, is filtered, is truncated (`"length"`) or is empty.

## 3. `create_conversation_memory(model, system, max_tokens, keep_recent, summary_max_tokens=300)`

Returns a `ConversationMemory` object that starts with an empty summary and history:

- `add(message)` appends a message to the history.
- `context()` returns the `"messages"` of `build_context` for the current summary and history.
- `await compact()` computes the overflow. With no overflow it returns `{"folded": 0, "summarized": False}` and calls no model. Otherwise it awaits `summarize(model, summary, overflow, summary_max_tokens)`:
  - on success, the result becomes the summary, the overflow messages are removed from the history, and it returns `{"folded": len(overflow), "summarized": True}`;
  - on failure, summary and history stay exactly as they were, and it returns `{"folded": 0, "summarized": False}`.
- `state()` returns `{"summary", "history"}` (a copy of the history).

The tests check budgets with `count_tokens`, which messages are kept, what the summary request contains, and that history survives every kind of summary failure across seeds; never the summary's wording.
