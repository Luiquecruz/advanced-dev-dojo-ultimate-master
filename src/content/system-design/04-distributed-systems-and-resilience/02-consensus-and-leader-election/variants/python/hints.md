`math.ceil(n / 2)` is half of an even cluster, and two halves of a four-node cluster do not overlap. Use `n // 2 + 1`; the fault tolerance is whatever is left over.
---
In `grant_vote`, handle the terms first: a lower term returns a copy of the state (`dict(voter)`) and `"granted": False`; a higher term builds a new dict with the request's term and `"voted_for": None` (`{**voter, "current_term": ..., "voted_for": None}`). Every later check works on that new dict, so a refused vote still returns the updated term.
---
The log check compares `last_log_term` first and only looks at `last_log_index` when the terms are equal: if `request["last_log_term"] != state["last_log_term"]`, the higher term wins; otherwise the candidate needs `request["last_log_index"] >= state["last_log_index"]`.
---
In `commit_index`, walk the indexes from the end of the leader's log down to 1 (`range(len(leader_log_terms), 0, -1)`), skip any index whose `leader_log_terms[index - 1]` is not `current_term`, and return the first one where `sum(1 for match in match_indexes if match >= index)` reaches the majority. Counting leaves the caller's list as it was; `match_indexes.sort()` would not.
