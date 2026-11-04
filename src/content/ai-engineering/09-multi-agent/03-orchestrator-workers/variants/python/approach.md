1. Treat the plan as untrusted structured output. A tolerant extractor recovers the common wrappers, and a strict validator turns everything else into `None`, so one decision point handles every malformed shape.
2. Layer the recovery: re-plan on an unusable reply or a provider error, then fall back to a one-subtask plan. The run degrades to a single worker instead of failing.
3. Bound parallelism with a semaphore around each call and gather the calls in input order. At most `limit` calls are in flight, and each result keeps its input position, so order never depends on timing.
4. Make a worker return a result, not raise. Failures become data (`"status"`, `"error"`) that the synthesis can mention, and one bad worker cannot sink the whole batch.
5. Skip synthesis when nothing succeeded: a model asked to combine zero findings invents them.
6. Count cost where it happens: add `"usage"` right after every response, including discarded plans and refused workers, so the total matches what the provider bills.
