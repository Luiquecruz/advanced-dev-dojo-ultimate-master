1. Measure each variant on the same dataset with repeated runs, because one run per case cannot tell a regression from noise. Keep passes, errors and runs per case, so the pass rate and the flakiness are both visible.
2. Treat model errors as failed runs: availability is part of quality, and skipping errors would flatter the variant that fails more.
3. Before comparing numbers, check that both runs cover the same case ids; otherwise the comparison measures a dataset change.
4. Diff case by case with a per-case tolerance, and report regressions and improvements separately so reviewers see the trade-off.
5. Apply two blocking rules: an aggregate drop beyond a tolerance chosen above the noise floor, and any regression on a critical case regardless of the average.
6. Return the reasons with the decision; a gate that blocks without saying why gets bypassed.
