1. Define the contract first: a case has an id, an input and an optional expected value; every scorer returns pass, a 0–1 score and a reason. Uniform results are what make aggregation trivial later.
2. Write the code-based scorers from cheapest to most permissive: exact comparison after normalizing only noise, strict JSON parsing plus schema validation, and embedding similarity against a threshold.
3. Make missing reference data an error inside the scorer, not a silent pass: a semantic or exact check without an expected value cannot decide anything.
4. Run cases sequentially so results line up with the dataset, and isolate failures at two levels: a model error fails its case and is recorded with its message; a scorer error fails only that score.
5. Aggregate from the case results only: overall pass rate with errored cases in the denominator, a separate errored count, and per-scorer pass rate and mean score over every case.
6. Keep the detail strings informative (expected vs actual, JSON error, schema paths, similarity vs threshold): they are what a developer reads when the report goes red.
