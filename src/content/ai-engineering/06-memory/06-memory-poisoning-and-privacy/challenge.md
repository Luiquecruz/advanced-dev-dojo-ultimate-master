Build a memory store that resists poisoning and respects privacy: every memory has an owner, a source and an expiry; instruction-like text from untrusted sources is refused; summaries are isolated per user and expire with their sources; and users can be forgotten, derived summaries included. Time is injected with `now()` (milliseconds).

A source is `{ kind, trusted, reference }` with `kind` one of `'user'`, `'assistant'`, `'tool'`, `'document'`. A memory is `{ id, userId, text, source, createdAt, expiresAt }`. A summary is `{ id, userId, text, derivedFrom, createdAt, expiresAt }`, where `derivedFrom` lists memory ids. Ids are unique strings. A memory or summary is **live** while `now() < expiresAt`.

## 1. `looksLikeInstruction(text)`

`true` when any regular expression in `INSTRUCTION_PATTERNS` (exported, already in the starter) matches the text.

## 2. `createSecureMemory({ model, retentionMs, now })`

`now` defaults to `Date.now`. The object has:

**`write(userId, text, source)`**

- Trimmed text empty: return `{ stored: false, reason: 'empty' }`.
- `source.trusted` is `false` and `looksLikeInstruction(text)`: return `{ stored: false, reason: 'instruction_from_untrusted_source' }`.
- Otherwise store `{ id, userId, text (trimmed), source, createdAt: now(), expiresAt: now() + retentionMs }` and return `{ stored: true, memory }`.

Refused writes store nothing.

**`read(userId)`** returns that user's live memories, oldest first. **`summaries(userId)`** returns that user's live summaries.

**`summarize(userId)`**

- With no live memories for the user, return `undefined` without calling the model.
- Otherwise make one `model.generate` call whose messages contain the text of each of the user's live memories, and nothing from other users or expired memories.
- If the call throws, or the reply is not `finishReason: 'stop'`, or its trimmed text is empty, return `undefined` and store nothing.
- Otherwise store and return a summary with the trimmed text, `derivedFrom` the ids of the memories sent (in order), `createdAt: now()`, and `expiresAt` equal to the **earliest** `expiresAt` among those memories.

**`purgeExpired()`** deletes every memory and summary that is not live and returns `{ memories, summaries }` with the numbers deleted.

**`forget(userId, memoryId)`** deletes the memory only if it belongs to `userId`, together with every summary whose `derivedFrom` contains it. Returns the counts deleted (`{ memories: 0, summaries: 0 }` for another user's memory).

**`erase(userId)`** deletes every memory and every summary of the user and returns the counts. Other users' data is untouched.

The tests check refusals for many attack phrasings and source kinds, isolation in reads, forgetting and summaries, expiry at the exact instant, and that summary failures across seeds store nothing.
