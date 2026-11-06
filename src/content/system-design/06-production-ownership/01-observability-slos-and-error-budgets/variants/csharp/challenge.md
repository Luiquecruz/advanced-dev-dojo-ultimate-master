Compute the numbers an on-call rotation runs on: the availability of a window, the error budget of an SLO period, the burn rate, and the decision to page someone. Counts are passed in as plain numbers (no clock, no metrics library), so each method is a small formula; the point is choosing the right one.

```csharp
public record WindowCounts(double Good, double Total);
public record ErrorBudget(double AllowedBad, double Remaining, double ConsumedRatio);

public static class Slo
{
    public static double Availability(double good, double total);
    public static ErrorBudget ErrorBudget(double slo, double total, double bad);
    public static double BurnRate(double slo, double good, double total);
    public static bool ShouldPage(double slo, WindowCounts longWindow, WindowCounts shortWindow, double threshold);
}
```

`slo` is a fraction: `0.999` means 99.9% of events must be good. `total` counts every event of a window or period, `good` the successful ones and `bad` the failed ones. Counts are `double`, as metrics systems usually store them, so every division is a floating-point division. The tests pass every argument by name. Return exact values without rounding; the tests compare numbers to 9 decimal places.

- **`Availability(good, total)`** returns `good / total`. A window with `total` `0` had no failed request and returns `1`.
- **`ErrorBudget(slo, total, bad)`** returns an `ErrorBudget` record with three numbers:
  - `AllowedBad`: how many bad events the SLO allows among `total`, `(1 - slo) * total`, not rounded. A 99.9% SLO allows `1_000` bad events in `1_000_000`, and `1.5` in `1_500`.
  - `Remaining`: `AllowedBad - bad`, negative once the budget is overspent.
  - `ConsumedRatio`: `bad / AllowedBad`, so `0.25` is a quarter of the budget and anything above `1` is overspent. When `AllowedBad` is `0` (an SLO of `1`, or no traffic), it is `0` without bad events and `double.PositiveInfinity` with any.
- **`BurnRate(slo, good, total)`** returns how fast the window spends the budget: its error rate, `(total - good) / total`, divided by the error rate the SLO allows, `1 - slo`. A window with `total` `0` burns `0`. A burn rate of `1` spends the budget exactly over the SLO period; `14.4` spends 2% of a 30-day budget in one hour.
- **`ShouldPage(slo, longWindow, shortWindow, threshold)`** returns `true` only when the burn rate of **both** windows is greater than `threshold`; a burn rate equal to `threshold` does not page. The long window proves that a significant share of the budget is gone, the short window proves that the burn is still happening. The fast-burn page uses a 1-hour long window, a 5-minute short window and a threshold of `14.4`.

Nothing here looks at a raw error count: 150 errors in an hour is an incident at 10,000 requests per hour and noise at 1,000,000.
