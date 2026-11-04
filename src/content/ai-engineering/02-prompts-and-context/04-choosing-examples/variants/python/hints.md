Build one candidate dict per pool example, `{"example": ..., "vector": ..., "score": ...}`, embedding each input a single time, and sort with `candidates.sort(key=lambda candidate: -candidate["score"])`: Python's sort is stable, so ties keep pool order.
---
Walk the sorted candidates with a `for` loop, a `selected` list and a `used_tokens` counter. `break` when `len(selected) >= k`; `continue` when the score is below the floor, when `any(...)` finds a chosen vector with similarity `>= duplicate_threshold`, or when `used_tokens + example_tokens(candidate["example"]) > max_tokens`.
---
Return `reversed(selected)` mapped to `{**candidate["example"], "score": candidate["score"]}`. `build_few_shot_messages` appends two messages per example between the system and the query messages. `normalize_label` is `text.strip().lower().removesuffix(".")` checked with `in labels`.
