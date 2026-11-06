export interface VoterState {
  currentTerm: number;
  votedFor: string | null;
  lastLogTerm: number;
  lastLogIndex: number;
}

export interface VoteRequest {
  term: number;
  candidateId: string;
  lastLogTerm: number;
  lastLogIndex: number;
}

export interface VoteResult {
  granted: boolean;
  state: VoterState;
}

export function majority(clusterSize: number): number {
  // TODO: a majority must overlap every other majority, also for even cluster sizes
  return Math.ceil(clusterSize / 2);
}

export function faultTolerance(clusterSize: number): number {
  // TODO: how many nodes can fail while a majority is still alive?
  return clusterSize - majority(clusterSize);
}

export function grantVote(voter: VoterState, request: VoteRequest): VoteResult {
  // TODO: refuse stale terms, reset the vote on a higher term, one vote per term, compare logs (last term, then last index)
  if (request.term >= voter.currentTerm && voter.votedFor === null) {
    return { granted: true, state: { ...voter, currentTerm: request.term, votedFor: request.candidateId } };
  }
  return { granted: false, state: { ...voter } };
}

export function commitIndex(matchIndexes: number[], leaderLogTerms: number[], currentTerm: number): number {
  // TODO: only an entry of the current term commits by counting replicas
  const needed = majority(matchIndexes.length);
  for (let index = leaderLogTerms.length; index >= 1; index--) {
    const replicas = matchIndexes.filter((match) => match >= index).length;
    if (replicas >= needed) {
      return index;
    }
  }
  return 0;
}

console.log('majority of 5:', majority(5), 'tolerates:', faultTolerance(5));
const voter: VoterState = { currentTerm: 3, votedFor: null, lastLogTerm: 3, lastLogIndex: 7 };
console.log(grantVote(voter, { term: 4, candidateId: 'node-b', lastLogTerm: 3, lastLogIndex: 7 }));
console.log('commit index:', commitIndex([5, 5, 4, 2, 1], [1, 1, 2, 3, 3], 3));
