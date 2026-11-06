using System.Globalization;

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
    private static readonly string[] Units = ["B", "KB", "MB", "GB", "TB", "PB"];

    public static CapacityEstimate Estimate(CapacityInput input)
    {
        var requestsPerDay = input.DailyActiveUsers * input.RequestsPerUserPerDay;
        var writesPerDay = (long)RoundHalfUp(requestsPerDay * input.WriteRatio);
        return new CapacityEstimate(
            AverageQps: (long)Math.Ceiling(requestsPerDay / SecondsPerDay),
            PeakQps: (long)Math.Ceiling(requestsPerDay * input.PeakFactor / SecondsPerDay),
            WriteQps: (long)Math.Ceiling(writesPerDay / SecondsPerDay),
            StorageBytes: writesPerDay * input.BytesPerWrite * input.RetentionDays * input.ReplicationFactor);
    }

    public static string FormatBytes(long bytes)
    {
        double value = bytes;
        var unit = 0;
        while (value >= 1000 && unit < Units.Length - 1)
        {
            value /= 1000;
            unit++;
        }
        var rounded = RoundHalfUp(value * 10) / 10;
        return $"{rounded.ToString(CultureInfo.InvariantCulture)} {Units[unit]}";
    }

    private static double RoundHalfUp(double value) => Math.Floor(value + 0.5);
}
