ADR = {
    "id": 5,
    "title": "Stream the nightly orders export through generators in batches of 80 000 rows",
    "status": "accepted",
    "context": (
        "The nightly export reads 30 000 000 order rows once, through a server-side cursor, and must finish within 2 hours. "
        "The worker is killed above 512 MB; with 64 MB of headroom and a 128 MB baseline, batches may use 320 MB of memory, "
        "at 2 000 bytes per row in a batch with 2 batches alive. The warehouse accepts 100 000 rows per insert and costs "
        "0.2 ms per row plus 0.5 s per insert. The daily totals are read twice, 10 consumers in other processes read each "
        "acknowledged batch, and a failed run must still finish within the window."
    ),
    "decision": (
        "We will stream the cursor through generator stages, accumulate the daily totals in the same pass and materialize "
        "only them at the sink, load batches of 80 000 rows with itertools.batched, publish each acknowledged batch to the "
        "consumers, resume from the last acknowledged batch and close the cursor in a with block."
    ),
    "alternatives": [
        {
            "option": "Lists between stages, each stage finished before the next starts",
            "reason": "30 000 000 rows at 1 200 bytes are 36 000 MB, about 80 times the 448 MB ceiling.",
        },
        {
            "option": "Batches of 100 000 rows, the warehouse maximum",
            "reason": "Two batches alive would add 400 MB to the 128 MB baseline, past the 448 MB ceiling.",
        },
        {
            "option": "A second scan to compute the daily totals",
            "reason": "One scan already takes about 6 190 s, so two scans cannot fit the 7 200 s window.",
        },
    ],
    "consequences": {
        "positive": [
            "The peak stays at 448 MB whatever the number of rows, because only two batches are ever alive.",
            "375 inserts and one scan take about 6 190 s, leaving about 17 minutes of the window for a restart.",
        ],
        "negative": [
            "The batch size depends on the measured bytes per row; wider rows need a new measurement and a smaller batch.",
            "Consumers see the export batch by batch and must cope with a run that stops halfway and resumes.",
        ],
    },
}

PLAN = {
    "pipeline": "generators",
    "batch_size": 80_000,
    "batches": 375,
    "peak_memory_mb": 128 + 2 * 80_000 * (1_200 + 800) / 10**6,
    "table_passes": 1,
    "materialize_at": "sink",
    "reiterable_results": True,
    "consumers": "notify_per_batch",
    "resume": "from_last_batch",
    "resource_cleanup": "context_manager",
    "rejected": [
        {
            "pattern": "list(cursor) before transforming",
            "reason": "The row objects alone would need 36 000 MB against a ceiling of 448 MB.",
        },
        {
            "pattern": "itertools.tee with one branch per consumer",
            "reason": "Ten consumers at their own pace would make tee buffer every row the slowest one has not read.",
        },
        {
            "pattern": "a checkpoint after every row",
            "reason": "30 000 000 writes of 2 ms each are 60 000 s, more than eight times the 7 200 s window.",
        },
    ],
}
