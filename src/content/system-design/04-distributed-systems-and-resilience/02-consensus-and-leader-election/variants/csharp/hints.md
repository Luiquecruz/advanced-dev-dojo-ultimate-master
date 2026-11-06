`(int)Math.Ceiling(n / 2.0)` is half of an even cluster, and two halves of a four-node cluster do not overlap. Integer division already rounds a cluster size down, so the majority is `n / 2 + 1`; the fault tolerance is whatever is left over.
---
In `GrantVote`, handle the terms first: a lower term returns `new VoteResult(false, voter)`; a higher term builds a new state with `voter with { CurrentTerm = request.Term, VotedFor = null }`. Every later check works on that new state, so a refused vote still returns the updated term.
---
The log check compares `LastLogTerm` first and only looks at `LastLogIndex` when the terms are equal: `request.LastLogTerm != state.LastLogTerm ? request.LastLogTerm > state.LastLogTerm : request.LastLogIndex >= state.LastLogIndex`.
---
In `CommitIndex`, walk the indexes from the end of the leader's log down to 1, skip any index whose `leaderLogTerms[index - 1]` is not `currentTerm`, and return the first one where `matchIndexes.Count(match => match >= index)` reaches the majority. Counting leaves the caller's array as it was; `Array.Sort(matchIndexes)` would not.
