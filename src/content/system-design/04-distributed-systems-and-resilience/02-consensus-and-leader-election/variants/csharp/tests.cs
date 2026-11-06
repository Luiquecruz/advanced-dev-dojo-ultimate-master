using Dojo;

public static class RaftTests
{
    [Test("majority and fault tolerance follow floor(n / 2) + 1 for odd cluster sizes")]
    public static void OddClusterSizes()
    {
        int[] sizes = [1, 3, 5, 7];
        Assert.SequenceEqual([1, 2, 3, 4], sizes.Select(size => Raft.Majority(size)));
        Assert.SequenceEqual([0, 1, 2, 3], sizes.Select(size => Raft.FaultTolerance(size)));
    }

    // beginner mistake: half of an even cluster counted as a quorum, so a 4-node cluster seems to tolerate 2 failures
    [Test("an even cluster needs more than half: 4 nodes need 3 votes and tolerate only 1 failure, like 3 nodes")]
    public static void EvenClusterSizes()
    {
        Assert.Equal(3, Raft.Majority(4));
        Assert.Equal(1, Raft.FaultTolerance(4));
        Assert.Equal(Raft.FaultTolerance(3), Raft.FaultTolerance(4));
        Assert.Equal(2, Raft.Majority(2));
        Assert.Equal(0, Raft.FaultTolerance(2));
        Assert.Equal(4, Raft.Majority(6));
    }

    [Test("a voter gives one vote per term, repeats it for the same candidate and refuses stale terms")]
    public static void OneVotePerTerm()
    {
        var voter = new VoterState(CurrentTerm: 2, VotedFor: null, LastLogTerm: 2, LastLogIndex: 5);
        Assert.Equal(new VoteResult(false, voter), Raft.GrantVote(voter, new VoteRequest(Term: 1, CandidateId: "c", LastLogTerm: 2, LastLogIndex: 5)));
        var first = Raft.GrantVote(voter, new VoteRequest(Term: 2, CandidateId: "a", LastLogTerm: 2, LastLogIndex: 5));
        Assert.Equal(new VoteResult(true, new VoterState(CurrentTerm: 2, VotedFor: "a", LastLogTerm: 2, LastLogIndex: 5)), first);
        Assert.Null(voter.VotedFor);
        var second = Raft.GrantVote(first.State, new VoteRequest(Term: 2, CandidateId: "b", LastLogTerm: 2, LastLogIndex: 9));
        Assert.Equal(new VoteResult(false, first.State), second);
        Assert.True(Raft.GrantVote(second.State, new VoteRequest(Term: 2, CandidateId: "a", LastLogTerm: 2, LastLogIndex: 5)).Granted);
    }

    [Test("a higher term resets the vote, and logs compare by last term before last index")]
    public static void HigherTermAndLogComparison()
    {
        var voted = new VoterState(CurrentTerm: 2, VotedFor: "a", LastLogTerm: 2, LastLogIndex: 5);
        Assert.Equal(
            new VoteResult(true, new VoterState(CurrentTerm: 3, VotedFor: "b", LastLogTerm: 2, LastLogIndex: 5)),
            Raft.GrantVote(voted, new VoteRequest(Term: 3, CandidateId: "b", LastLogTerm: 2, LastLogIndex: 5)));
        Assert.Equal(new VoterState(CurrentTerm: 2, VotedFor: "a", LastLogTerm: 2, LastLogIndex: 5), voted);
        var voter = new VoterState(CurrentTerm: 5, VotedFor: null, LastLogTerm: 4, LastLogIndex: 9);
        Assert.True(Raft.GrantVote(voter, new VoteRequest(Term: 6, CandidateId: "c", LastLogTerm: 5, LastLogIndex: 3)).Granted);
        Assert.Equal(
            new VoteResult(false, new VoterState(CurrentTerm: 6, VotedFor: null, LastLogTerm: 4, LastLogIndex: 9)),
            Raft.GrantVote(voter, new VoteRequest(Term: 6, CandidateId: "d", LastLogTerm: 4, LastLogIndex: 8)));
        Assert.False(Raft.GrantVote(voter, new VoteRequest(Term: 6, CandidateId: "e", LastLogTerm: 3, LastLogIndex: 20)).Granted);
        Assert.True(Raft.GrantVote(voter, new VoteRequest(Term: 6, CandidateId: "f", LastLogTerm: 4, LastLogIndex: 9)).Granted);
    }

    [Test("the commit index is the highest index stored on a majority whose entry is from the current term")]
    public static void CommitIndexNeedsCurrentTerm()
    {
        int[] matchIndexes = [2, 5, 1, 4, 5];
        Assert.Equal(4, Raft.CommitIndex(matchIndexes, [1, 1, 2, 3, 3], 3));
        Assert.SequenceEqual([2, 5, 1, 4, 5], matchIndexes);
        Assert.Equal(1, Raft.CommitIndex([3, 1, 1], [1, 1, 1], 1));
        Assert.Equal(0, Raft.CommitIndex([4, 3, 1], [1, 2, 2, 4], 4));
        Assert.Equal(4, Raft.CommitIndex([4, 4, 1], [1, 2, 2, 4], 4));
    }
}
