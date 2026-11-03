`validateWorkerOutput` returns early for the finish reason, the JSON parse and the `claims` array, then walks the claims collecting **every** problem into one list (a worker fixes more in one retry when it hears about all of them). Remember that `JSON.parse('null')` succeeds: read `claims` with optional chaining.
---
In `gatherClaims`, keep `let problems: string[] = []` per task. Each attempt builds the user message from the instruction, `sourceIds.join(', ')` and, when `problems` is not empty, the problems. A `ModelError` sets `problems` to a message with `error.code`; anything else rethrows.
---
For voting, write a `ballot(model, voter, content)` helper that never throws for model trouble: return `null` for errors, unfinished replies, unparsable JSON and missing answers. Then `await Promise.all(voters.map(...))` for each round, and a `winner(ballots)` helper that counts non-null answers and divides by `voters.length`.
---
The delegation guard keeps a `Map` from `chain.join('/')` to the number of delegations that chain made, plus a `total` counter. Check `chain.includes(target)`, `chain.length > maxDepth`, the map count and the total, in that order, and update both counters only when allowing. Expose `total` with a getter.
