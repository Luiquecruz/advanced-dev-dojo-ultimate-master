Implement the rules a Raft node uses to count a majority, decide a vote and advance the commit index. Every function is pure: no network, no timers, and no input object is modified.

```ts
interface VoterState { currentTerm: number; votedFor: string | null; lastLogTerm: number; lastLogIndex: number }
interface VoteRequest { term: number; candidateId: string; lastLogTerm: number; lastLogIndex: number }
interface VoteResult { granted: boolean; state: VoterState }

export function majority(clusterSize: number): number
export function faultTolerance(clusterSize: number): number
export function grantVote(voter: VoterState, request: VoteRequest): VoteResult
export function commitIndex(matchIndexes: number[], leaderLogTerms: number[], currentTerm: number): number
```

**`majority(clusterSize)`** returns the smallest group size for which any two groups of that size share a node: `⌊clusterSize / 2⌋ + 1`, for odd and even sizes alike. **`faultTolerance(clusterSize)`** returns how many nodes can fail while a majority is still alive.

**`grantVote(voter, request)`** returns whether the voter grants its vote and the voter's state after handling the request, as a new object:

1. `request.term < voter.currentTerm`: refuse, the state stays the same.
2. `request.term > voter.currentTerm`: first move to that term with `votedFor: null`, then continue with the rules below (even a refused vote keeps the new term).
3. Refuse when `votedFor` is set to a different candidate in this term. Voting again for the same candidate is allowed.
4. Refuse unless the candidate's log is at least as up-to-date: a higher `lastLogTerm` wins; with equal `lastLogTerm`, the candidate needs `lastLogIndex >= voter.lastLogIndex`.
5. Otherwise grant and set `votedFor` to `request.candidateId`.

**`commitIndex(matchIndexes, leaderLogTerms, currentTerm)`**: `matchIndexes` holds, for every node of the cluster including the leader, the highest log index known to be stored on that node. `leaderLogTerms[i]` is the term of the leader's entry at index `i + 1` (indexes start at 1). Return the highest index `N` such that a majority of the cluster has `matchIndex >= N` **and** the entry at `N` belongs to `currentTerm`; return `0` when no index qualifies.

The file ends with a small demo that the **Run** button prints.
