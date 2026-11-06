1. Decide who owns the writer. The exporter receives it and keeps it in a field as its own, so the exporter must release it, and anyone who creates an exporter must dispose the exporter.
2. Write `WriteRow` in three steps: refuse to work after disposal, validate the whole row, and only then write and count. Validating first keeps a failed call free of side effects.
3. Make disposal safe to repeat. A flag that you set before releasing the writer turns the second `Dispose` or `DisposeAsync` into a no-op, so the writer is released exactly once whichever method runs first.
4. Look at the starter's `ReportWriter`: there is no point where the exporter is disposed, and a `Dispose()` call added at the end would be skipped by the exception from a bad row. Run the last test in your head with that version, then replace it with `await using`, which the compiler turns into `try`/`finally`.
5. Confirm that the exception still reaches the caller: `await using` cleans up, it does not catch anything.
