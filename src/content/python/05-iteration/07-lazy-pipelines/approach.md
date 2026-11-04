1. Draw the chain from source to sink and mark where the starter builds a complete list. Every mark is a point where the whole log is read before anything is sent.
2. Convert the stages one at a time into generators and check each on its own: `parse` with a blank and a malformed line, `only_errors` with mixed levels, `chunked` with a count that does not divide evenly.
3. Trace the first `next()` on the pipeline with chunks of 2 over the test log: which lines each stage pulls, and why the answer is 4 reads and not 8 (or 6).
4. Decide which object owns the source and where it is released. List the three ways the pipeline can end and make one `finally` cover all of them.
5. Check that a `ValueError` from `parse` still reaches the caller after the cleanup has run, and that reading stopped at the bad line.
6. Run the demo: it stops after the first chunk, closes the pipeline and prints how many lines were read.
