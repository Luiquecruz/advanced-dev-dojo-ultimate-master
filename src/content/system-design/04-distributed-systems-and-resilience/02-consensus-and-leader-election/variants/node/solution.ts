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
  return Math.floor(clusterSize / 2) + 1;
}

export function faultTolerance(clusterSize: number): number {
  return clusterSize - majority(clusterSize);
}

function isAtLeastAsUpToDate(request: VoteRequest, voter: VoterState): boolean {
  if (request.lastLogTerm !== voter.lastLogTerm) {
    return request.lastLogTerm > voter.lastLogTerm;
  }
  return request.lastLogIndex >= voter.lastLogIndex;
}

export function grantVote(voter: VoterState, request: VoteRequest): VoteResult {
  if (request.term < voter.currentTerm) {
    return { granted: false, state: { ...voter } };
  }
  const state: VoterState = request.term > voter.currentTerm ? { ...voter, currentTerm: request.term, votedFor: null } : { ...voter };
  const canVote = state.votedFor === null || state.votedFor === request.candidateId;
  if (!canVote || !isAtLeastAsUpToDate(request, state)) {
    return { granted: false, state };
  }
  return { granted: true, state: { ...state, votedFor: request.candidateId } };
}

export function commitIndex(matchIndexes: number[], leaderLogTerms: number[], currentTerm: number): number {
  const needed = majority(matchIndexes.length);
  for (let index = leaderLogTerms.length; index >= 1; index--) {
    if (leaderLogTerms[index - 1] !== currentTerm) {
      continue;
    }
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
