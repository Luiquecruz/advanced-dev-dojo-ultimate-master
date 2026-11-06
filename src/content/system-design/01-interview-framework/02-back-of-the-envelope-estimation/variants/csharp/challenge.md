Turn the scale numbers of a design discussion into capacity targets. Everything is plain arithmetic, but the order of the steps and the rounding are part of the contract, so the same input always gives the same estimate.

```csharp
public record CapacityInput(
    long DailyActiveUsers,
    double RequestsPerUserPerDay,
    double PeakFactor,      // peak traffic ÷ average traffic, e.g. 2
    double WriteRatio,      // fraction of requests that are writes, between 0 and 1
    long BytesPerWrite,     // bytes stored by one write
    int RetentionDays,      // how long written data is kept
    int ReplicationFactor); // how many copies of each byte are stored

public record CapacityEstimate(long AverageQps, long PeakQps, long WriteQps, long StorageBytes);

public static class CapacityEstimator
{
    public const double SecondsPerDay = 86_400;
    public static CapacityEstimate Estimate(CapacityInput input);
    public static string FormatBytes(long bytes);
}
```

`SecondsPerDay` (`86,400`) is already defined, as a `double`, so dividing a count by it never truncates. Compute, in this order:

| Value | Formula |
| --- | --- |
| requests per day | `DailyActiveUsers × RequestsPerUserPerDay` |
| writes per day | `Math.Floor(requests per day × WriteRatio + 0.5)`, rounded half up: `500.5` writes become `501` (`Math.Round` would give `500`, because it rounds a half to the even number unless it gets `MidpointRounding.AwayFromZero`) |
| `AverageQps` | `Math.Ceiling(requests per day / 86,400)` |
| `PeakQps` | `Math.Ceiling(requests per day × PeakFactor / 86,400)`: apply the factor to the unrounded average, not to `AverageQps` |
| `WriteQps` | `Math.Ceiling(writes per day / 86,400)` |
| `StorageBytes` | `writes per day × BytesPerWrite × RetentionDays × ReplicationFactor` (no rounding needed) |

`Math.Floor` and `Math.Ceiling` return a `double`; cast each result to `long`. QPS values are rounded up because capacity is planned for at least the expected load. Every other rounding goes to the nearest value, and a value exactly halfway rounds up.

`FormatBytes(bytes)` uses powers of 1,000 and the units `B`, `KB`, `MB`, `GB`, `TB`, `PB`: divide by 1,000 while the value is at least 1,000 and a larger unit exists, then round half up to one decimal place with `Math.Floor(value * 10 + 0.5) / 10` (1,250 bytes is `"1.3 KB"`) and print the number with `CultureInfo.InvariantCulture`, without a trailing `.0`. The unit is chosen before rounding, so a value that rounds up to 1,000 keeps its unit: 999,950 bytes is `"1000 KB"`. The number and the unit are separated by one space: `FormatBytes(1_500)` is `"1.5 KB"`, `FormatBytes(1_000)` is `"1 KB"`, `FormatBytes(999)` is `"999 B"`, and values beyond 1,000 PB stay in `PB` (`"5000 PB"`).
