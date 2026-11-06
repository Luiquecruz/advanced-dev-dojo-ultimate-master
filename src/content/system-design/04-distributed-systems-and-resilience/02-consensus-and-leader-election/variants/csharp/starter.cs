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
    public static int Majority(int clusterSize)
    {
        // TODO: a majority must overlap every other majority, also for even cluster sizes
        return (int)Math.Ceiling(clusterSize / 2.0);
    }

    public static int FaultTolerance(int clusterSize)
    {
        // TODO: how many nodes can fail while a majority is still alive?
        return clusterSize - Majority(clusterSize);
    }

    public static VoteResult GrantVote(VoterState voter, VoteRequest request)
    {
        // TODO: refuse stale terms, reset the vote on a higher term, one vote per term, compare logs (last term, then last index)
        if (request.Term >= voter.CurrentTerm && voter.VotedFor is null)
        {
            return new VoteResult(true, voter with { CurrentTerm = request.Term, VotedFor = request.CandidateId });
        }
        return new VoteResult(false, voter);
    }

    public static int CommitIndex(int[] matchIndexes, int[] leaderLogTerms, int currentTerm)
    {
        // TODO: only an entry of the current term commits by counting replicas
        var needed = Majority(matchIndexes.Length);
        for (var index = leaderLogTerms.Length; index >= 1; index--)
        {
            var replicas = matchIndexes.Count(match => match >= index);
            if (replicas >= needed)
            {
                return index;
            }
        }
        return 0;
    }
}
