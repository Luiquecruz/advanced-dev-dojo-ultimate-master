Every method works on rates, not counts. `Availability` is `good / total` and the error rate of the same window is `(total - good) / total`; decide the `total == 0` case first in both, before dividing.
---
In `ErrorBudget`, compute `allowedBad` once and derive the other two values from it. Dividing by zero is the only special case: with `double`, `1 / 0.0` is already `double.PositiveInfinity`, but `0 / 0.0` is `double.NaN`, and the contract asks for `0` there.
---
`BurnRate` is the window's error rate divided by `1 - slo`. `ShouldPage` calls it twice, once with `longWindow.Good` and `longWindow.Total` and once with the short window's counts, and combines the two comparisons with `&&`: `longBurn > threshold && shortBurn > threshold`.
