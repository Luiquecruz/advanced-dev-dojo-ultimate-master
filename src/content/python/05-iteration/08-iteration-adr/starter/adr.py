ADR = {
    "id": 5,
    # TODO: a short title naming the decision
    "title": "",
    # TODO: accept the decision
    "status": "proposed",
    # TODO: the forces from the briefing: rows, memory ceiling and baseline, warehouse limit and costs, window, totals, consumers
    "context": "",
    # TODO: one sentence starting with "We will", naming the generator stages and the batch size
    "decision": "",
    # TODO: at least two {"option": ..., "reason": ...} you considered and rejected, each reason citing a number from the briefing
    "alternatives": [],
    # TODO: what the team gains and what it pays or must watch
    "consequences": {"positive": [], "negative": []},
}

PLAN = {
    # TODO: 30 000 000 rows at 1 200 bytes each against a 448 MB ceiling
    "pipeline": "lists",
    # TODO: between the smallest batch the window allows and the largest the memory and the warehouse allow
    "batch_size": 100_000,
    # TODO: compute the number of bulk inserts for your batch size
    "batches": 0,
    # TODO: compute the baseline plus the batches alive at once, in MB
    "peak_memory_mb": 0,
    # TODO: how many scans of the table fit the window?
    "table_passes": 2,
    # TODO: the totals are small and read twice; the rows are huge
    "materialize_at": "each_stage",
    "reiterable_results": False,
    # TODO: 10 consumers in other processes, each at its own pace
    "consumers": "after_full_export",
    # TODO: a failed run must still finish within the window
    "resume": "from_start",
    # TODO: the cursor's connection must be released on every exit
    "resource_cleanup": "none",
    # TODO: at least two {"pattern": ..., "reason": ...}
    "rejected": [],
}
