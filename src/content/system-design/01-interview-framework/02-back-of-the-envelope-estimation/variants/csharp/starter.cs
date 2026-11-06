// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
var estimate = CapacityEstimator.Estimate(new CapacityInput(
    DailyActiveUsers: 10_000_000,
    RequestsPerUserPerDay: 10,
    PeakFactor: 2,
    WriteRatio: 0.1,
    BytesPerWrite: 1_000,
    RetentionDays: 1_825,
    ReplicationFactor: 3));
Console.WriteLine(estimate);
Console.WriteLine(CapacityEstimator.FormatBytes(estimate.StorageBytes));

public record CapacityInput(
    long DailyActiveUsers,
    double RequestsPerUserPerDay,
    double PeakFactor,
    double WriteRatio,
    long BytesPerWrite,
    int RetentionDays,
    int ReplicationFactor);

public record CapacityEstimate(long AverageQps, long PeakQps, long WriteQps, long StorageBytes);

public static class CapacityEstimator
{
    public const double SecondsPerDay = 86_400;

    public static CapacityEstimate Estimate(CapacityInput input)
    {
        // TODO: requests per day = daily active users × requests per user per day
        double requestsPerDay = 0;
        // TODO: writes per day = requests per day × write ratio, rounded half up: (long)Math.Floor(x + 0.5)
        long writesPerDay = 0;
        return new CapacityEstimate(
            // TODO: Math.Ceiling(requests per day / SecondsPerDay)
            AverageQps: (long)requestsPerDay,
            // TODO: Math.Ceiling(requests per day × peak factor / SecondsPerDay), from the unrounded average
            PeakQps: (long)(requestsPerDay * input.PeakFactor),
            // TODO: Math.Ceiling(writes per day / SecondsPerDay)
            WriteQps: writesPerDay,
            // TODO: writes per day × bytes per write × retention days × replication factor
            StorageBytes: writesPerDay * input.BytesPerWrite);
    }

    public static string FormatBytes(long bytes)
    {
        // TODO: divide by 1,000 while the value is at least 1,000 (B, KB, MB, GB, TB, PB) and round half up to one decimal
        return $"{bytes} B";
    }
}
