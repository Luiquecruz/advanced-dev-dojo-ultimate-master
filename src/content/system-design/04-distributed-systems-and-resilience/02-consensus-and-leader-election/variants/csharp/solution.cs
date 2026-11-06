// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
Console.WriteLine($"majority of 5: {Raft.Majority(5)} tolerates: {Raft.FaultTolerance(5)}");
var voter = new VoterState(CurrentTerm: 3, VotedFor: null, LastLogTerm: 3, LastLogIndex: 7);
Console.WriteLine(Raft.GrantVote(voter, new VoteRequest(Term: 4, CandidateId: "node-b", LastLogTerm: 3, LastLogIndex: 7)));
Console.WriteLine($"commit index: {Raft.CommitIndex([5, 5, 4, 2, 1], [1, 1, 2, 3, 3], 3)}");

public record VoterState(int CurrentTerm, string? VotedFor, int LastLogTerm, int LastLogIndex);
public record VoteRequest(int Term, string CandidateId, int LastLogTerm, int LastLogIndex);
public record VoteResult(bool Granted, VoterState State);

public static class Raft
{
    public static int Majority(int clusterSize) => clusterSize / 2 + 1;

    public static int FaultTolerance(int clusterSize) => clusterSize - Majority(clusterSize);

    public static VoteResult GrantVote(VoterState voter, VoteRequest request)
    {
        if (request.Term < voter.CurrentTerm)
        {
            return new VoteResult(false, voter);
        }
        var state = request.Term > voter.CurrentTerm ? voter with { CurrentTerm = request.Term, VotedFor = null } : voter;
        var canVote = state.VotedFor is null || state.VotedFor == request.CandidateId;
        if (!canVote || !IsAtLeastAsUpToDate(request, state))
        {
            return new VoteResult(false, state);
        }
        return new VoteResult(true, state with { VotedFor = request.CandidateId });
    }

    public static int CommitIndex(int[] matchIndexes, int[] leaderLogTerms, int currentTerm)
    {
        var needed = Majority(matchIndexes.Length);
        for (var index = leaderLogTerms.Length; index >= 1; index--)
        {
            if (leaderLogTerms[index - 1] != currentTerm)
            {
                continue;
            }
            var replicas = matchIndexes.Count(match => match >= index);
            if (replicas >= needed)
            {
                return index;
            }
        }
        return 0;
    }

    private static bool IsAtLeastAsUpToDate(VoteRequest request, VoterState voter)
    {
        if (request.LastLogTerm != voter.LastLogTerm)
        {
            return request.LastLogTerm > voter.LastLogTerm;
        }
        return request.LastLogIndex >= voter.LastLogIndex;
    }
}
