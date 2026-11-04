1. Name the bug in one sentence: a mutable collection reachable through a shared reference.
2. Choose the mutability that removes the bug, then derive what the cache-key use forces on hashing, equality and the collections stored inside.
3. Compute `copy_on_read_cost_ms` from the reads per request and the deep-copy time, keeping track of the unit conversion.
4. Compare that number with the latency budget and the write frequency, and pick the sharing policy and the copy strategy that go with it.
5. Decide how "not provided" differs from `None` and `0`, and which operator checks it.
6. Write the ADR: the context with the bug and the numbers, a `We will` decision naming the mutability, rejected alternatives with their reason, and honest consequences.
7. Re-read the coherence rules and check every plan value against them, including the number.
