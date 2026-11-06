test('majority and fault tolerance follow floor(n / 2) + 1 for odd cluster sizes', () => {
  expect([1, 3, 5, 7].map((size) => mod.majority(size))).toEqual([1, 2, 3, 4]);
  expect([1, 3, 5, 7].map((size) => mod.faultTolerance(size))).toEqual([0, 1, 2, 3]);
});

// beginner mistake: half of an even cluster counted as a quorum, so a 4-node cluster seems to tolerate 2 failures
test('an even cluster needs more than half: 4 nodes need 3 votes and tolerate only 1 failure, like 3 nodes', () => {
  expect(mod.majority(4)).toBe(3);
  expect(mod.faultTolerance(4)).toBe(1);
  expect(mod.faultTolerance(4)).toBe(mod.faultTolerance(3));
  expect(mod.majority(2)).toBe(2);
  expect(mod.faultTolerance(2)).toBe(0);
  expect(mod.majority(6)).toBe(4);
});

test('a voter gives one vote per term, repeats it for the same candidate and refuses stale terms', () => {
  const voter = { currentTerm: 2, votedFor: null, lastLogTerm: 2, lastLogIndex: 5 };
  expect(mod.grantVote(voter, { term: 1, candidateId: 'c', lastLogTerm: 2, lastLogIndex: 5 })).toEqual({ granted: false, state: voter });
  const first = mod.grantVote(voter, { term: 2, candidateId: 'a', lastLogTerm: 2, lastLogIndex: 5 });
  expect(first).toEqual({ granted: true, state: { currentTerm: 2, votedFor: 'a', lastLogTerm: 2, lastLogIndex: 5 } });
  expect(voter.votedFor).toBe(null);
  const second = mod.grantVote(first.state, { term: 2, candidateId: 'b', lastLogTerm: 2, lastLogIndex: 9 });
  expect(second).toEqual({ granted: false, state: first.state });
  expect(mod.grantVote(second.state, { term: 2, candidateId: 'a', lastLogTerm: 2, lastLogIndex: 5 }).granted).toBe(true);
});

test('a higher term resets the vote, and logs compare by last term before last index', () => {
  const voted = { currentTerm: 2, votedFor: 'a', lastLogTerm: 2, lastLogIndex: 5 };
  expect(mod.grantVote(voted, { term: 3, candidateId: 'b', lastLogTerm: 2, lastLogIndex: 5 })).toEqual({
    granted: true,
    state: { currentTerm: 3, votedFor: 'b', lastLogTerm: 2, lastLogIndex: 5 },
  });
  expect(voted).toEqual({ currentTerm: 2, votedFor: 'a', lastLogTerm: 2, lastLogIndex: 5 });
  const voter = { currentTerm: 5, votedFor: null, lastLogTerm: 4, lastLogIndex: 9 };
  expect(mod.grantVote(voter, { term: 6, candidateId: 'c', lastLogTerm: 5, lastLogIndex: 3 }).granted).toBe(true);
  expect(mod.grantVote(voter, { term: 6, candidateId: 'd', lastLogTerm: 4, lastLogIndex: 8 })).toEqual({
    granted: false,
    state: { currentTerm: 6, votedFor: null, lastLogTerm: 4, lastLogIndex: 9 },
  });
  expect(mod.grantVote(voter, { term: 6, candidateId: 'e', lastLogTerm: 3, lastLogIndex: 20 }).granted).toBe(false);
  expect(mod.grantVote(voter, { term: 6, candidateId: 'f', lastLogTerm: 4, lastLogIndex: 9 }).granted).toBe(true);
});

test('the commit index is the highest index stored on a majority whose entry is from the current term', () => {
  const matchIndexes = [2, 5, 1, 4, 5];
  expect(mod.commitIndex(matchIndexes, [1, 1, 2, 3, 3], 3)).toBe(4);
  expect(matchIndexes).toEqual([2, 5, 1, 4, 5]);
  expect(mod.commitIndex([3, 1, 1], [1, 1, 1], 1)).toBe(1);
  expect(mod.commitIndex([4, 3, 1], [1, 2, 2, 4], 4)).toBe(0);
  expect(mod.commitIndex([4, 4, 1], [1, 2, 2, 4], 4)).toBe(4);
});
