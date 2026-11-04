`validate_worker_output` returns early for the finish reason, the JSON parse (`json.loads` inside `try`/`except ValueError`) and the `"claims"` list, then walks the claims collecting **every** problem into one list (a worker fixes more in one retry when it hears about all of them). Remember that `json.loads("null")` succeeds and returns `None`: read `"claims"` only from a dict, and each claim's fields only when the claim is a dict.
---
In `gather_claims`, keep `problems = []` per task. Each attempt builds the user message from the instruction, `", ".join(task["sourceIds"])` and, when `problems` is not empty, the problems. A `ModelError` sets `problems` to a message with `error.code`; anything else propagates.
---
For voting, write a `ballot(model, voter, content)` coroutine that never raises for model trouble: return `None` for errors, unfinished replies, unparsable JSON and missing answers. Then `await asyncio.gather(*(ballot(model, voter, content) for voter in voters))` for each round, and a `winner(ballots, voters, quorum)` helper that counts non-`None` answers and divides by `len(voters)`.
---
The delegation guard keeps a dict from `"/".join(chain)` to the number of delegations that chain made, plus a `total` counter. Check `target in chain`, `len(chain) > max_depth`, the dict count and the total, in that order, and update both counters only when allowing.
