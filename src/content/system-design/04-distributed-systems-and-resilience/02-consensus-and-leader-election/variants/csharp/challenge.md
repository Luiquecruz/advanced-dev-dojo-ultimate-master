Implement the rules a Raft node uses to count a majority, decide a vote and advance the commit index. Every method is pure: no network, no timers, and no input is modified.

```csharp
public record VoterState(int CurrentTerm, string? VotedFor, int LastLogTerm, int LastLogIndex);
public record VoteRequest(int Term, string CandidateId, int LastLogTerm, int LastLogIndex);
public record VoteResult(bool Granted, VoterState State);

public static class Raft
{
    public static int Majority(int clusterSize);
    public static int FaultTolerance(int clusterSize);
    public static VoteResult GrantVote(VoterState voter, VoteRequest request);
    public static int CommitIndex(int[] matchIndexes, int[] leaderLogTerms, int currentTerm);
}
```

**`Majority(clusterSize)`** returns the smallest group size for which any two groups of that size share a node: `⌊clusterSize / 2⌋ + 1`, for odd and even sizes alike (a cluster size is never negative). **`FaultTolerance(clusterSize)`** returns how many nodes can fail while a majority is still alive.

**`GrantVote(voter, request)`** returns whether the voter grants its vote (`Granted`) and the voter's state after handling the request (`State`). The records are immutable, so the input stays as it was and a changed state is a new `VoterState`:

1. `request.Term < voter.CurrentTerm`: refuse, the state stays the same.
2. `request.Term > voter.CurrentTerm`: first move to that term with `VotedFor = null`, then continue with the rules below (even a refused vote keeps the new term).
3. Refuse when `VotedFor` is set to a different candidate in this term. Voting again for the same candidate is allowed.
4. Refuse unless the candidate's log is at least as up-to-date: a higher `LastLogTerm` wins; with equal `LastLogTerm`, the candidate needs `request.LastLogIndex >= voter.LastLogIndex`.
5. Otherwise grant and set `VotedFor` to `request.CandidateId`.

**`CommitIndex(matchIndexes, leaderLogTerms, currentTerm)`**: `matchIndexes` holds, for every node of the cluster including the leader, the highest log index known to be stored on that node. `leaderLogTerms[i]` is the term of the leader's entry at index `i + 1` (indexes start at 1). Return the highest index `N` such that a majority of the cluster has a match index `>= N` **and** the entry at `N` belongs to `currentTerm`; return `0` when no index qualifies. Both arrays belong to the caller: read them, never reorder them.

The file opens with a small demo that the **Run** button prints.
