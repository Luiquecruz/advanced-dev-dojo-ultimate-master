# Checkpoint: the Iteration ADR

This module answered three questions. **When does the work happen?** A generator runs only when the consumer pulls, one item at a time, so a chain of generator stages holds one row (or one chunk) instead of the whole input. **Who owns the iteration state?** An iterable hands out fresh iterators; an iterator, a generator or a database cursor is one-shot, and reading it again is a new pass over the source. **When is laziness wrong?** When a result is needed twice, sorted or indexed: then you materialize it once, at the sink, and only if it is small. `itertools.batched` turns the stream into bulk chunks for the sink, `tee` buffers whatever its slowest branch has not read yet, and the stage that opens a resource closes it in `try`/`finally`.

The checkpoint turns those mechanisms into the design of a large export: an **Architecture Decision Record** plus a **plan** whose numbers are derived from the briefing.

## The decision checklist

1. **Does the data fit at all?** Rows × bytes per row, compared with the memory left after the process's baseline. When it does not, no stage may collect the stream, and lists between stages are out.
2. **How large may a batch be?** Memory for batches = limit − headroom − baseline. One row in a batch costs its objects plus its encoded payload, and several batches may be alive at once (one sent while the next fills). The largest batch is the free memory divided by both; the sink's own limit may be lower.
3. **How small may it be?** Every bulk call pays a fixed overhead. Rows ÷ batch size, rounded up, is the number of calls, and their overhead plus the per-row cost must fit the time window.
4. **How many passes?** A second read of a one-shot source is a second full scan. When a result is needed twice, either scan again (time) or materialize it (memory): accumulate small results in the same pass and keep only those.
5. **Who sees partial results?** A sink that publishes each batch once it is stored lets consumers in other processes read at their own pace. `tee` lives in one process and keeps every item its slowest branch has not consumed.
6. **How does it resume and clean up?** Checkpoint at batch boundaries, and release the cursor on every exit with a `with` block or `try`/`finally`.
7. **Rejected options.** At least two, each with the number that ruled it out.

## The arithmetic

```py
import math

rows, row_bytes, alive = 10_000_000, 3_000, 2       # bytes per row in a batch, batches held at once
free_mb = 1_024 - 100 - 224                         # limit - headroom - baseline: 700 MB for batches
largest = free_mb * 10**6 // (row_bytes * alive)    # 116 666 rows by memory
batch = min(largest, 100_000)                       # the sink accepts 100 000 rows per call
batches = math.ceil(rows / batch)                   # 100 bulk calls
peak_mb = 224 + alive * batch * row_bytes / 10**6   # 824.0 MB, under the 924 MB ceiling
one_pass_s = rows * 0.000_1 + batches * 1.0         # 1 000 s of rows + 100 s of overhead
```

## Coherence is the point

A list between stages for tens of millions of rows needs tens of gigabytes. A batch sized for the sink's limit instead of the memory budget gets the worker killed at the first large night. Tiny batches pay their overhead thousands of times and miss the window. A second scan to compute totals doubles the run, and a generator handed to two readers gives the second one nothing. The tests check these relationships, and the batch count and the peak memory are numbers you compute.

## Example: a search index rebuild

```py
PLAN = {
    "pipeline": "generators",
    "batch_size": 100_000,                    # the sink limit binds before memory does
    "batches": 100,
    "peak_memory_mb": 224 + 2 * 100_000 * 3_000 / 10**6,   # 824.0
    "table_passes": 1,                        # facet counts accumulate in the same pass
    "materialize_at": "sink",                 # only the facet counts, a few thousand entries
    "reiterable_results": True,
    "consumers": "notify_per_batch",
    "resume": "from_last_batch",
    "resource_cleanup": "context_manager",
    "rejected": [{"pattern": "list(cursor)", "reason": "10 million rows of objects do not fit the 924 MB ceiling."}],
}
```

If the sink accepted 200 000 rows per call, memory would bind instead and the batch would drop to at most 116 666 rows. If the window were 15 minutes, no batch size would save one pass of 1 000 s of row work: the ADR would have to change the design (parallel workers, a cheaper transform) instead of picking a number.
