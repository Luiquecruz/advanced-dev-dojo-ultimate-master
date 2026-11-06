Compute the numbers an on-call rotation runs on: the availability of a window, the error budget of an SLO period, the burn rate, and the decision to page someone. Counts are passed in as plain numbers (no clock, no metrics library), so each function is a small formula; the point is choosing the right one.

```ts
interface WindowCounts { good: number; total: number }
interface ErrorBudget { allowedBad: number; remaining: number; consumedRatio: number }

export function availability(window: WindowCounts): number
export function errorBudget(input: { slo: number; total: number; bad: number }): ErrorBudget
export function burnRate(input: { slo: number; good: number; total: number }): number
export function shouldPage(input: { slo: number; longWindow: WindowCounts; shortWindow: WindowCounts; threshold: number }): boolean
```

`slo` is a fraction: `0.999` means 99.9% of events must be good. `total` counts every event of a window or period, `good` the successful ones and `bad` the failed ones. Return exact values without rounding; the tests compare numbers to 9 decimal places.

- **`availability({ good, total })`** returns `good / total`. A window with `total` `0` had no failed request and returns `1`.
- **`errorBudget({ slo, total, bad })`** returns three numbers:
  - `allowedBad`: how many bad events the SLO allows among `total`, `(1 - slo) * total`, not rounded. A 99.9% SLO allows `1_000` bad events in `1_000_000`, and `1.5` in `1_500`.
  - `remaining`: `allowedBad - bad`, negative once the budget is overspent.
  - `consumedRatio`: `bad / allowedBad`, so `0.25` is a quarter of the budget and anything above `1` is overspent. When `allowedBad` is `0` (an SLO of `1`, or no traffic), it is `0` without bad events and `Infinity` with any.
- **`burnRate({ slo, good, total })`** returns how fast the window spends the budget: its error rate, `(total - good) / total`, divided by the error rate the SLO allows, `1 - slo`. A window with `total` `0` burns `0`. A burn rate of `1` spends the budget exactly over the SLO period; `14.4` spends 2% of a 30-day budget in one hour.
- **`shouldPage({ slo, longWindow, shortWindow, threshold })`** returns `true` only when the burn rate of **both** windows is greater than `threshold`; a burn rate equal to `threshold` does not page. The long window proves that a significant share of the budget is gone, the short window proves that the burn is still happening. The fast-burn page uses a 1-hour long window, a 5-minute short window and a threshold of `14.4`.

Nothing here looks at a raw error count: 150 errors in an hour is an incident at 10,000 requests per hour and noise at 1,000,000.
