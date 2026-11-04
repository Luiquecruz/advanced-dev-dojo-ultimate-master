1. Read each starter function and name the loop shape it implements by hand: chunks, runs, running totals or neighbors. Each shape has one `itertools` tool.
2. Find what in the starter only works on lists (`list(records)`, slicing, `len`) and check it against a generator input; the tests pass generators on purpose.
3. For `batches`, check laziness with a source that counts reads: requesting the first batch must read exactly one batch of records.
4. For `runs`, write the expected output for `ok, ok, error, ok` by hand and compare it with what a dict counter or a sort would give.
5. For `running_totals` and `transitions`, check the edges: empty input, one item, and a sequence with no change.
6. Run the demo and compare the run report with the per-status totals it prints.
