def majority(cluster_size):
    return cluster_size // 2 + 1


def fault_tolerance(cluster_size):
    return cluster_size - majority(cluster_size)


def is_at_least_as_up_to_date(request, voter):
    if request["last_log_term"] != voter["last_log_term"]:
        return request["last_log_term"] > voter["last_log_term"]
    return request["last_log_index"] >= voter["last_log_index"]


def grant_vote(voter, request):
    if request["term"] < voter["current_term"]:
        return {"granted": False, "state": dict(voter)}
    state = dict(voter)
    if request["term"] > voter["current_term"]:
        state.update(current_term=request["term"], voted_for=None)
    can_vote = state["voted_for"] is None or state["voted_for"] == request["candidate_id"]
    if not can_vote or not is_at_least_as_up_to_date(request, state):
        return {"granted": False, "state": state}
    return {"granted": True, "state": {**state, "voted_for": request["candidate_id"]}}


def commit_index(match_indexes, leader_log_terms, current_term):
    needed = majority(len(match_indexes))
    for index in range(len(leader_log_terms), 0, -1):
        if leader_log_terms[index - 1] != current_term:
            continue
        replicas = sum(1 for match in match_indexes if match >= index)
        if replicas >= needed:
            return index
    return 0


if __name__ == "__main__":
    print("majority of 5:", majority(5), "tolerates:", fault_tolerance(5))
    voter = {"current_term": 3, "voted_for": None, "last_log_term": 3, "last_log_index": 7}
    print(grant_vote(voter, {"term": 4, "candidate_id": "node-b", "last_log_term": 3, "last_log_index": 7}))
    print("commit index:", commit_index([5, 5, 4, 2, 1], [1, 1, 2, 3, 3], 3))
