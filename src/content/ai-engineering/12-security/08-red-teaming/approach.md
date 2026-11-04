1. Generate the dataset combinatorially: a few payload ideas crossed with real documents and positions give broad coverage, and stable ids make every case traceable across releases.
2. Define success as the attacker's goal, per category, with deterministic detectors (hosts, secrets, forbidden tools, canaries, markers). Never score by wording, which changes between runs and models.
3. Run cases sequentially and isolate failures: a target error is neither a success nor a resistance, so record it apart and keep it out of the rates.
4. Aggregate per category, because limits differ: zero tolerance for exfiltration and tool misuse may coexist with a small tolerance for goal hijack.
5. Gate on several signals at once: absolute limits per category, the overall rate against the baseline, the list of attacks that newly succeed, and any errors. Flat rates can hide regressions; the id list cannot.
6. Treat the suite as living: every incident and red-team finding becomes a new seed, and the baseline moves only when a release passes.
