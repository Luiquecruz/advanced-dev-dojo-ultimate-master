import math


def majority(cluster_size):
    # TODO: a majority must overlap every other majority, also for even cluster sizes
    return math.ceil(cluster_size / 2)


def fault_tolerance(cluster_size):
    # TODO: how many nodes can fail while a majority is still alive?
    return cluster_size - majority(cluster_size)


def grant_vote(voter, request):
    # TODO: refuse stale terms, reset the vote on a higher term, one vote per term, compare logs (last term, then last index)
    if request["term"] >= voter["current_term"] and voter["voted_for"] is None:
        return {"granted": True, "state": {**voter, "current_term": request["term"], "voted_for": request["candidate_id"]}}
    return {"granted": False, "state": dict(voter)}


def commit_index(match_indexes, leader_log_terms, current_term):
    # TODO: only an entry of the current term commits by counting replicas
    needed = majority(len(match_indexes))
    for index in range(len(leader_log_terms), 0, -1):
        replicas = sum(1 for match in match_indexes if match >= index)
        if replicas >= needed:
            return index
    return 0


if __name__ == "__main__":
    print("majority of 5:", majority(5), "tolerates:", fault_tolerance(5))
    voter = {"current_term": 3, "voted_for": None, "last_log_term": 3, "last_log_index": 7}
    print(grant_vote(voter, {"term": 4, "candidate_id": "node-b", "last_log_term": 3, "last_log_index": 7}))
    print("commit index:", commit_index([5, 5, 4, 2, 1], [1, 1, 2, 3, 3], 3))
