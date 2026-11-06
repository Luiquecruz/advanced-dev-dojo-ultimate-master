using Dojo;

public static class CapacityTests
{
    private static readonly CapacityInput ChatApp = new(
        DailyActiveUsers: 1_000_000,
        RequestsPerUserPerDay: 20,
        PeakFactor: 3,
        WriteRatio: 0.05,
        BytesPerWrite: 500,
        RetentionDays: 365,
        ReplicationFactor: 3);

    private static readonly CapacityInput TextService = new(
        DailyActiveUsers: 10_000_000,
        RequestsPerUserPerDay: 10,
        PeakFactor: 2,
        WriteRatio: 0.1,
        BytesPerWrite: 1_000,
        RetentionDays: 1_825,
        ReplicationFactor: 3);

    // beginner mistake: dividing by 3,600 or 1,440 instead of 86,400 seconds, or forgetting the requests per user
    [Test("the average QPS divides users × requests per user by 86,400 seconds and rounds up")]
    public static void AverageQpsRoundsUp()
    {
        Assert.Equal(232, CapacityEstimator.Estimate(ChatApp).AverageQps);
        Assert.Equal(1158, CapacityEstimator.Estimate(TextService).AverageQps);
    }

    [Test("the peak QPS applies the peak factor to the unrounded average")]
    public static void PeakQpsUsesTheUnroundedAverage()
    {
        Assert.Equal(695, CapacityEstimator.Estimate(ChatApp).PeakQps);
        Assert.Equal(2315, CapacityEstimator.Estimate(TextService).PeakQps);
        var busier = TextService with { DailyActiveUsers = 50_000_000, RequestsPerUserPerDay = 4, PeakFactor = 2.5 };
        Assert.Equal(5788, CapacityEstimator.Estimate(busier).PeakQps);
    }

    [Test("the write QPS and the storage count only writes, kept for the retention period on every replica")]
    public static void WriteQpsAndStorageCountOnlyWrites()
    {
        var estimate = CapacityEstimator.Estimate(TextService);
        Assert.Equal(116, estimate.WriteQps);
        Assert.Equal(54_750_000_000_000, estimate.StorageBytes);
        Assert.Equal(new CapacityEstimate(AverageQps: 232, PeakQps: 695, WriteQps: 12, StorageBytes: 547_500_000_000), CapacityEstimator.Estimate(ChatApp));
        Assert.Equal(182_500_000_000, CapacityEstimator.Estimate(ChatApp with { ReplicationFactor = 1 }).StorageBytes);
        var halfWrite = ChatApp with { DailyActiveUsers = 1_001, RequestsPerUserPerDay = 1, WriteRatio = 0.5 };
        Assert.Equal(274_297_500, CapacityEstimator.Estimate(halfWrite).StorageBytes);
    }

    [Test("the byte formatter uses powers of 1,000 with at most one decimal and stops at PB")]
    public static void FormatsBytesInPowersOfOneThousand()
    {
        Assert.Equal("0 B", CapacityEstimator.FormatBytes(0));
        Assert.Equal("999 B", CapacityEstimator.FormatBytes(999));
        Assert.Equal("1 KB", CapacityEstimator.FormatBytes(1_000));
        Assert.Equal("1.3 KB", CapacityEstimator.FormatBytes(1_250));
        Assert.Equal("1.5 KB", CapacityEstimator.FormatBytes(1_500));
        Assert.Equal("1000 KB", CapacityEstimator.FormatBytes(999_950));
        Assert.Equal("2.5 MB", CapacityEstimator.FormatBytes(2_500_000));
        Assert.Equal("3 GB", CapacityEstimator.FormatBytes(3_000_000_000));
        Assert.Equal("4.8 TB", CapacityEstimator.FormatBytes(4_800_000_000_000));
        Assert.Equal("5000 PB", CapacityEstimator.FormatBytes(5_000_000_000_000_000_000));
    }
}
