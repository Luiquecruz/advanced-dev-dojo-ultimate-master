1. Check whether the table fits in memory at all: rows × bytes per row as Python objects, against the ceiling. The answer decides the pipeline shape.
2. Compute the memory left for batches and the largest batch it allows with two batches alive, then cap it by the warehouse limit.
3. Compute the smallest batch the window allows from the per-row and per-insert costs. Pick a batch size between the two bounds, then derive `batches` and `peak_memory_mb` from it.
4. Decide how the daily totals are produced so the job scans the table only as often as the window allows, and where the one small result that is read twice is materialized.
5. Choose how consumers get partial results, how a failed run resumes, and how the cursor is released, each from a number or a fact in the briefing.
6. Write the ADR: the numbers in the context, a `We will` decision naming the generator stages and the batch size, rejected alternatives with the number that ruled each out, and honest negative consequences.
7. Re-read the coherence rules against every plan value, including the batch count and the peak memory.
