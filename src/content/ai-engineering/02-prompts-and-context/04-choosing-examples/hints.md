Map the pool to `{ example, index, vector, score }` once, embedding each input a single time, and sort with `right.score - left.score || left.index - right.index` so ties keep pool order.
---
Walk the sorted candidates with a `for...of` loop, a `selected` array and a `usedTokens` counter. `break` when `selected.length >= k`; `continue` when the score is below the floor, when `selected.some(...)` finds a chosen vector with similarity `>= duplicateThreshold`, or when `usedTokens + exampleTokens(candidate.example) > maxTokens`.
---
Return `selected.reverse()` mapped to `{ ...example, score }`. `buildFewShotMessages` is a `flatMap` over the examples between the system and the query messages. `normalizeLabel` is `text.trim().toLowerCase().replace(/\.$/, '')` checked with `labels.includes`.
