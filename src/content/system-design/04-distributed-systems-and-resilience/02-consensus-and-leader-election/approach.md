1. Start from the property a quorum must have: any two quorums share a node. For `n` nodes that means more than half, `⌊n/2⌋ + 1`, and the nodes outside one quorum are the failures you can absorb.
2. Treat terms as a logical clock in `grantVote`: a message from the past is ignored, a message from the future moves the voter into that term and clears its vote before anything else is decided.
3. Check the two safety conditions in order: the voter still has its vote for this term (or already gave it to this same candidate), and the candidate's log would not lose committed entries (last term first, then last index).
4. Return a new state object in every branch, so the caller decides when to persist it and the input stays untouched.
5. For the commit index, search from the highest index down so the first match is the answer, and require both a majority of `matchIndexes` and an entry from the current term; older-term entries become committed only through a later current-term entry.
