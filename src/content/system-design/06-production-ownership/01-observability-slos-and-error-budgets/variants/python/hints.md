Every function works on rates, not counts. `availability` is `good / total` and the error rate of the same window is `(total - good) / total`; handle `total == 0` first in both, because dividing by zero raises `ZeroDivisionError`.
---
In `error_budget`, compute `allowed_bad` once and derive the other two values from it. Check `allowed_bad == 0` before dividing: the contract asks for `0` when nothing failed and `math.inf` when something did.
---
`burn_rate` is the window's error rate divided by `1 - slo`. `should_page` calls it twice, unpacking each window dict into keyword arguments, and joins the two comparisons with `and`: `burn_rate(slo=slo, **long_window) > threshold` and the same for `short_window`.
