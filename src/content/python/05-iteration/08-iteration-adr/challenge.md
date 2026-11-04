Write the ADR and the plan for a **nightly orders export**.

## Briefing

A nightly job exports the `orders` table to the analytics warehouse. MB means 10⁶ bytes.

- **Source:** **30 000 000** rows, read through a server-side database cursor that yields one row at a time. The cursor can be read **once**; reading the table again is a new full scan.
- **Memory:** the worker is killed above **512 MB**, and the team keeps **64 MB** of headroom below that, so the peak must stay at or below **448 MB**. Before the first row, the interpreter, the database driver and the warehouse client already use **128 MB**. A transformed row costs **1 200 bytes** as Python objects, and while it is in a batch its encoded copy in the bulk payload costs another **800 bytes**. At most **2 batches** are alive at once: one being sent while the next one fills.
- **Warehouse:** one bulk insert accepts at most **100 000 rows**. Measured costs for the whole job: **0.2 ms per row** (read, transform, load) plus **0.5 s per bulk insert**, its acknowledgement and checkpoint included. Fewer, larger inserts are cheaper.
- **Window:** the export must finish within **2 hours** (7 200 s).
- **Totals:** a reconciliation step needs the per-day order totals (one small record per day, 365 records) **twice**: once to compare with the source, once to write the report.
- **Consumers:** **10** downstream jobs (dashboards, fraud checks) read each batch as soon as the warehouse acknowledges it. They run in other processes, each at its own pace.
- **Failures:** when the job fails, it restarts and must still finish within the window. Writing a checkpoint outside a bulk insert costs **2 ms**.
- **Resources:** the cursor holds a database connection that must be released however the job ends: finished, stopped early or failed.

## Task

In `adr.py`, define two constants.

**`ADR`**, the record:

- `id`: a positive integer; `title`: at least 10 characters; `status`: `"accepted"`.
- `context`: at least 80 characters; mentions the `row`s and the `memory` limit.
- `decision`: at least 40 characters, starts with `We will`, and names the `generator` stages and the `batch`es.
- `alternatives`: at least two `{"option", "reason"}` with distinct options (at least 3 characters) and reasons of at least 20 characters.
- `consequences`: `{"positive": [...], "negative": [...]}`, each with at least one item of at least 15 characters.

**`PLAN`**, the design:

- `pipeline`: `"generators"` (every stage pulls one row at a time from the one before), `"lists"` (every stage returns a full list) or `"mixed"` (generator stages, but the transformed rows are collected into one list before batching).
- `batch_size`: an integer, the rows per bulk insert.
- `batches`: an integer, the number of bulk inserts for the whole export.
- `peak_memory_mb`: a number, the peak memory with your batch size: the baseline plus the batches alive at once. Compute it from the briefing.
- `table_passes`: an integer, how many times the job scans the table.
- `materialize_at`: `"never"`, `"sink"` (only the small final result is built as a list or dict) or `"each_stage"`.
- `reiterable_results`: `True` or `False`, whether the totals can be read more than once.
- `consumers`: `"notify_per_batch"` (the sink publishes each acknowledged batch), `"tee_per_consumer"` (`itertools.tee` of the row stream, one branch per consumer) or `"after_full_export"`.
- `resume`: `"from_last_batch"`, `"from_start"` or `"per_row_checkpoint"`.
- `resource_cleanup`: `"try_finally"`, `"context_manager"` or `"none"`.
- `rejected`: at least two `{"pattern", "reason"}` with distinct patterns (at least 3 characters) and reasons of at least 20 characters.

The plan must be coherent with the briefing. The tests check these relationships, so reason from the numbers rather than from the field names:

1. No stage holds more rows than the memory allows.
2. The peak memory follows from your batch size and stays under the ceiling, and a batch fits one bulk insert.
3. The number of inserts follows from your batch size, and every scan the job makes fits the window together.
4. The totals can be read twice without another scan, and nothing larger than them is materialized.
5. Consumers get each batch when it is acknowledged without anything buffering for the slowest one, a failed run can still finish in the window, and the cursor is released on every exit.
6. The decision sentence names the mechanisms you put in the plan.

The tests check structure and coherence, not your wording.
