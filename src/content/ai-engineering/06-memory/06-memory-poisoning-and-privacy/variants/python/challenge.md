Build a memory store that resists poisoning and respects privacy: every memory has an owner, a source and an expiry; instruction-like text from untrusted sources is refused; summaries are isolated per user and expire with their sources; and users can be forgotten, derived summaries included. Time is injected with `now()` (milliseconds).

Sources, memories and summaries are dicts whose keys keep the JSON names. A source is `{"kind", "trusted", "reference"}` with `"kind"` one of `"user"`, `"assistant"`, `"tool"`, `"document"`. A memory is `{"id", "userId", "text", "source", "createdAt", "expiresAt"}`. A summary is `{"id", "userId", "text", "derivedFrom", "createdAt", "expiresAt"}`, where `"derivedFrom"` lists memory ids. Ids are unique strings. A memory or summary is **live** while `now() < expiresAt`.

## 1. `looks_like_instruction(text)`

`True` when any compiled pattern in `INSTRUCTION_PATTERNS` (a module constant, already in the starter) finds a match in the text (`pattern.search`).

## 2. `create_secure_memory(model, retention_ms, now=...)`

`now` defaults to the current time in milliseconds. Returns a `SecureMemory` with:

**`write(user_id, text, source)`**

- Stripped text empty: return `{"stored": False, "reason": "empty"}`.
- `source["trusted"]` is `False` and `looks_like_instruction(text)`: return `{"stored": False, "reason": "instruction_from_untrusted_source"}`.
- Otherwise store `{"id", "userId": user_id, "text": <stripped>, "source", "createdAt": now(), "expiresAt": now() + retention_ms}` and return `{"stored": True, "memory": memory}`.

Refused writes store nothing.

**`read(user_id)`** returns that user's live memories, oldest first. **`summaries(user_id)`** returns that user's live summaries.

**`await summarize(user_id)`**

- With no live memories for the user, return `None` without calling the model.
- Otherwise make one `await model.generate(request)` call whose messages contain the text of each of the user's live memories, and nothing from other users or expired memories.
- If the call raises (`ModelError`), or the reply's `"finishReason"` is not `"stop"`, or its stripped text is empty, return `None` and store nothing.
- Otherwise store and return a summary with the stripped text, `"derivedFrom"` the ids of the memories sent (in order), `"createdAt": now()`, and `"expiresAt"` equal to the **earliest** `"expiresAt"` among those memories.

**`purge_expired()`** deletes every memory and summary that is not live and returns `{"memories", "summaries"}` with the numbers deleted.

**`forget(user_id, memory_id)`** deletes the memory only if it belongs to `user_id`, together with every summary whose `"derivedFrom"` contains it. Returns the counts deleted (`{"memories": 0, "summaries": 0}` for another user's memory).

**`erase(user_id)`** deletes every memory and every summary of the user and returns the counts. Other users' data is untouched.

The tests check refusals for many attack phrasings and source kinds, isolation in reads, forgetting and summaries, expiry at the exact instant, and that summary failures across seeds store nothing.
