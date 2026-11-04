`looks_like_instruction` is one `any(pattern.search(text) for pattern in INSTRUCTION_PATTERNS)`. In `write`, check the two refusal cases in order before computing anything else, then build the memory with `"expiresAt": now() + retention_ms` and a copy of the source (`dict(source)`).
---
Write one helper method that returns the live items of a user: filter by `"userId"` and `now() < item["expiresAt"]`. `read`, `summaries` and `summarize` all start from it, which is what keeps other users and expired data out of the summary request. Store the lists under names that do not clash with the `summaries` method, such as `stored_memories` and `stored_summaries`.
---
In `summarize`, wrap the call in `try/except Exception` and return `None` for every failure before appending anything. `"derivedFrom"` is the ids of the live memories you sent, and `"expiresAt"` is `min(...)` of their expiries.
---
`purge_expired`, `forget` and `erase` are all "filter both lists and count what disappeared". For `forget`, first check with `any(...)` that a memory with that id and that `"userId"` exists; then drop it and every summary whose `"derivedFrom"` contains its id.
