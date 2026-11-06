Every function works on rates, not counts. `availability` is `good / total` and the error rate of the same window is `(total - good) / total`; decide the `total === 0` case first in both, before dividing.
---
In `errorBudget`, compute `allowedBad` once and derive the other two values from it. Dividing by zero is the only special case: in JavaScript `1 / 0` is already `Infinity`, but `0 / 0` is `NaN`, and the contract asks for `0` there.
---
`burnRate` is the window's error rate divided by `1 - slo`. `shouldPage` calls it twice, spreading each window into the input, and combines the two comparisons with `&&`: `burnRate({ slo, ...longWindow }) > threshold` and the same for `shortWindow`.
