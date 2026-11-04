Start with memory. The 448 MB ceiling minus the 128 MB baseline is what the batches may use. One row in a batch costs its objects plus its encoded copy, and two batches are alive at once: divide to get the largest batch, then compare it with the warehouse's limit. Your `peak_memory_mb` is the baseline plus the two batches at the size you pick.
---
Then time. One scan costs 0.2 ms per row plus 0.5 s per insert. The row part does not depend on the batch size; the number of inserts, rows divided by the batch size and rounded up, decides whether a small batch still fits 7 200 s. Does a second scan of the table fit at all?
---
The totals are tiny and needed twice; the rows are huge and needed once. That decides what to materialize, where, and how many scans the job makes. For the consumers, remember where `tee` keeps its buffer and in which process. For failures, compare restarting from row 0 late in the window with 30 million checkpoint writes of 2 ms.
