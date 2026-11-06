Implement the rules a Raft node uses to count a majority, decide a vote and advance the commit index. Every function is pure: no network, no timers, and no input dict or list is modified.

```python
voter = {"current_term": 3, "voted_for": None, "last_log_term": 3, "last_log_index": 7}
request = {"term": 4, "candidate_id": "node-b", "last_log_term": 3, "last_log_index": 7}

def majority(cluster_size: int) -> int: ...
def fault_tolerance(cluster_size: int) -> int: ...
def grant_vote(voter: dict, request: dict) -> dict: ...  # {"granted": True, "state": {...}}
def commit_index(match_indexes: list[int], leader_log_terms: list[int], current_term: int) -> int: ...
```

**`majority(cluster_size)`** returns the smallest group size for which any two groups of that size share a node: `⌊cluster_size / 2⌋ + 1`, for odd and even sizes alike. **`fault_tolerance(cluster_size)`** returns how many nodes can fail while a majority is still alive.

**`grant_vote(voter, request)`** returns `{"granted": ..., "state": ...}`: whether the voter grants its vote, and the voter's state after handling the request as a new dict:

1. `request["term"] < voter["current_term"]`: refuse, the state stays the same.
2. `request["term"] > voter["current_term"]`: first move to that term with `"voted_for": None`, then continue with the rules below (even a refused vote keeps the new term).
3. Refuse when `voted_for` is set to a different candidate in this term. Voting again for the same candidate is allowed.
4. Refuse unless the candidate's log is at least as up-to-date: a higher `last_log_term` wins; with equal `last_log_term`, the candidate's `last_log_index` must be greater than or equal to the voter's.
5. Otherwise grant and set `voted_for` to `request["candidate_id"]`.

**`commit_index(match_indexes, leader_log_terms, current_term)`**: `match_indexes` holds, for every node of the cluster including the leader, the highest log index known to be stored on that node. `leader_log_terms[i]` is the term of the leader's entry at index `i + 1` (indexes start at 1). Return the highest index `N` such that a majority of the cluster has a match index `>= N` **and** the entry at `N` belongs to `current_term`; return `0` when no index qualifies.

The file ends with a small demo under `if __name__ == "__main__":` that the **Run** button prints.
