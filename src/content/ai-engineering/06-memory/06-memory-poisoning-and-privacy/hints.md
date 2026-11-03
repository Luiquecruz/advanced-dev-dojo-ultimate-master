`looksLikeInstruction` is one `some` over the patterns. In `write`, check the two refusal cases in order before computing anything else, then build the memory with `expiresAt: now() + retentionMs` and a copy of the source.
---
Write one helper that returns the live items of a user: filter by `userId` and `now() < expiresAt`. `read`, `summaries` and `summarize` all start from it, which is what keeps other users and expired data out of the summary request.
---
In `summarize`, wrap the call in `try/catch` and return `undefined` for every failure before pushing anything. `derivedFrom` is the ids of the live memories you sent, and `expiresAt` is `Math.min(...)` of their expiries.
---
`purgeExpired`, `forget` and `erase` are all "filter both arrays and count what disappeared". For `forget`, first check that a memory with that id and that `userId` exists; then drop it and every summary whose `derivedFrom` includes its id.
