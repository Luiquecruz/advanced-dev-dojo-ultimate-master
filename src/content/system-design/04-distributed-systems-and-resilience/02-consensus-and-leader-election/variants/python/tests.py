@test("majority and fault tolerance follow floor(n / 2) + 1 for odd cluster sizes")
def _():
    majorities = [mod.majority(size) for size in [1, 3, 5, 7]]
    tolerances = [mod.fault_tolerance(size) for size in [1, 3, 5, 7]]
    assert majorities == [1, 2, 3, 4]
    assert tolerances == [0, 1, 2, 3]


# beginner mistake: half of an even cluster counted as a quorum, so a 4-node cluster seems to tolerate 2 failures
@test("an even cluster needs more than half: 4 nodes need 3 votes and tolerate only 1 failure, like 3 nodes")
def _():
    majority_of_4 = mod.majority(4)
    tolerance_of_4 = mod.fault_tolerance(4)
    assert majority_of_4 == 3
    assert tolerance_of_4 == 1
    assert tolerance_of_4 == mod.fault_tolerance(3)
    assert mod.majority(2) == 2
    assert mod.fault_tolerance(2) == 0
    assert mod.majority(6) == 4


@test("a voter gives one vote per term, repeats it for the same candidate and refuses stale terms")
def _():
    voter = {"current_term": 2, "voted_for": None, "last_log_term": 2, "last_log_index": 5}
    stale = mod.grant_vote(voter, {"term": 1, "candidate_id": "c", "last_log_term": 2, "last_log_index": 5})
    assert stale == {"granted": False, "state": voter}
    first = mod.grant_vote(voter, {"term": 2, "candidate_id": "a", "last_log_term": 2, "last_log_index": 5})
    assert first == {"granted": True, "state": {"current_term": 2, "voted_for": "a", "last_log_term": 2, "last_log_index": 5}}
    assert voter["voted_for"] is None
    second = mod.grant_vote(first["state"], {"term": 2, "candidate_id": "b", "last_log_term": 2, "last_log_index": 9})
    assert second == {"granted": False, "state": first["state"]}
    again = mod.grant_vote(second["state"], {"term": 2, "candidate_id": "a", "last_log_term": 2, "last_log_index": 5})
    assert again["granted"] is True


@test("a higher term resets the vote, and logs compare by last term before last index")
def _():
    voted = {"current_term": 2, "voted_for": "a", "last_log_term": 2, "last_log_index": 5}
    newer_term = mod.grant_vote(voted, {"term": 3, "candidate_id": "b", "last_log_term": 2, "last_log_index": 5})
    assert newer_term == {"granted": True, "state": {"current_term": 3, "voted_for": "b", "last_log_term": 2, "last_log_index": 5}}
    assert voted == {"current_term": 2, "voted_for": "a", "last_log_term": 2, "last_log_index": 5}
    voter = {"current_term": 5, "voted_for": None, "last_log_term": 4, "last_log_index": 9}
    higher_last_term = mod.grant_vote(voter, {"term": 6, "candidate_id": "c", "last_log_term": 5, "last_log_index": 3})
    assert higher_last_term["granted"] is True
    shorter_log = mod.grant_vote(voter, {"term": 6, "candidate_id": "d", "last_log_term": 4, "last_log_index": 8})
    assert shorter_log == {"granted": False, "state": {"current_term": 6, "voted_for": None, "last_log_term": 4, "last_log_index": 9}}
    lower_last_term = mod.grant_vote(voter, {"term": 6, "candidate_id": "e", "last_log_term": 3, "last_log_index": 20})
    assert lower_last_term["granted"] is False
    same_log = mod.grant_vote(voter, {"term": 6, "candidate_id": "f", "last_log_term": 4, "last_log_index": 9})
    assert same_log["granted"] is True


@test("the commit index is the highest index stored on a majority whose entry is from the current term")
def _():
    match_indexes = [2, 5, 1, 4, 5]
    committed = mod.commit_index(match_indexes, [1, 1, 2, 3, 3], 3)
    assert committed == 4
    assert match_indexes == [2, 5, 1, 4, 5]
    single_term = mod.commit_index([3, 1, 1], [1, 1, 1], 1)
    assert single_term == 1
    only_older_terms_on_a_majority = mod.commit_index([4, 3, 1], [1, 2, 2, 4], 4)
    assert only_older_terms_on_a_majority == 0
    current_term_on_a_majority = mod.commit_index([4, 4, 1], [1, 2, 2, 4], 4)
    assert current_term_on_a_majority == 4
