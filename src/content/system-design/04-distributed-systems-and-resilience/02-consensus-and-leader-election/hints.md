`Math.ceil(n / 2)` is half of an even cluster, and two halves of a four-node cluster do not overlap. Use `Math.floor(n / 2) + 1`; the fault tolerance is whatever is left over.
---
In `grantVote`, handle the terms first: a lower term returns a copy of the state and `granted: false`; a higher term builds a new state with the request's term and `votedFor: null`. Every later check works on that new state, so a refused vote still returns the updated term.
---
The log check compares `lastLogTerm` first and only looks at `lastLogIndex` when the terms are equal: `request.lastLogTerm !== state.lastLogTerm ? request.lastLogTerm > state.lastLogTerm : request.lastLogIndex >= state.lastLogIndex`.
---
In `commitIndex`, walk the indexes from the end of the leader's log down to 1, skip any index whose `leaderLogTerms[index - 1]` is not `currentTerm`, and return the first one where `matchIndexes.filter((match) => match >= index).length` reaches the majority. Filtering leaves the caller's array as it was; sorting it in place would not.
