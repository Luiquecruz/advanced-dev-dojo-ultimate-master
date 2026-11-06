using Dojo;

public static class SloTests
{
    private static double Round(double value) => Math.Floor(value * 1e9 + 0.5) / 1e9;

    private static ErrorBudget Rounded(ErrorBudget budget) =>
        new(Round(budget.AllowedBad), Round(budget.Remaining), Round(budget.ConsumedRatio));

    [Test("availability is good / total, and a window without requests counts as fully available")]
    public static void MeasuresAvailability()
    {
        Assert.Equal(0.999, Slo.Availability(good: 999_000, total: 1_000_000), 1e-9);
        Assert.Equal(0.995, Slo.Availability(good: 9_950, total: 10_000), 1e-9);
        Assert.Equal(0, Slo.Availability(good: 0, total: 40));
        Assert.Equal(1, Slo.Availability(good: 0, total: 0));
    }

    [Test("the error budget turns the SLO into allowed bad events, what remains and the share consumed, without rounding")]
    public static void TurnsTheSloIntoABudget()
    {
        Assert.Equal(new ErrorBudget(1_000, 750, 0.25), Rounded(Slo.ErrorBudget(slo: 0.999, total: 1_000_000, bad: 250)));
        Assert.Equal(new ErrorBudget(1_000, -300, 1.3), Rounded(Slo.ErrorBudget(slo: 0.999, total: 1_000_000, bad: 1_300)));
        Assert.Equal(new ErrorBudget(2_000, 500, 0.75), Rounded(Slo.ErrorBudget(slo: 0.9995, total: 4_000_000, bad: 1_500)));
        Assert.Equal(new ErrorBudget(1.5, 0.5, 0.666666667), Rounded(Slo.ErrorBudget(slo: 0.999, total: 1_500, bad: 1)));
        Assert.Equal(new ErrorBudget(0, -1, double.PositiveInfinity), Slo.ErrorBudget(slo: 1, total: 1_000_000, bad: 1));
        Assert.Equal(new ErrorBudget(0, 0, 0), Slo.ErrorBudget(slo: 0.99, total: 0, bad: 0));
    }

    [Test("the burn rate divides the error rate of the window by the error rate the SLO allows")]
    public static void DividesTheErrorRateByTheAllowedRate()
    {
        Assert.Equal(1, Slo.BurnRate(slo: 0.999, good: 999_000, total: 1_000_000), 1e-9);
        Assert.Equal(14.4, Slo.BurnRate(slo: 0.999, good: 9_856, total: 10_000), 1e-9);
        Assert.Equal(3, Slo.BurnRate(slo: 0.99, good: 9_700, total: 10_000), 1e-9);
        Assert.Equal(0, Slo.BurnRate(slo: 0.999, good: 1_000, total: 1_000));
        Assert.Equal(0, Slo.BurnRate(slo: 0.999, good: 0, total: 0));
    }

    // beginner mistake: paging on a raw error count, or on the short window alone, instead of the budget burn of both windows
    [Test("paging follows the burn rate of both windows, not the raw number of errors")]
    public static void PagesOnTheBurnOfBothWindows()
    {
        static bool Page(WindowCounts longWindow, WindowCounts shortWindow) =>
            Slo.ShouldPage(slo: 0.999, longWindow: longWindow, shortWindow: shortWindow, threshold: 14.4);

        Assert.True(Page(new WindowCounts(Good: 9_850, Total: 10_000), new WindowCounts(Good: 820, Total: 833)));
        Assert.False(Page(new WindowCounts(Good: 999_850, Total: 1_000_000), new WindowCounts(Good: 83_320, Total: 83_333)));
        Assert.False(Page(new WindowCounts(Good: 99_467, Total: 100_000), new WindowCounts(Good: 7_800, Total: 8_333)));
    }

    [Test("a burn that already stopped does not page, a sustained one does, and the threshold is respected")]
    public static void PagesOnlyOnASustainedBurnAboveTheThreshold()
    {
        var incidentHour = new WindowCounts(Good: 98_000, Total: 100_000);
        var sixHours = new WindowCounts(Good: 594_000, Total: 600_000);
        var thirtyMinutes = new WindowCounts(Good: 49_400, Total: 50_000);
        Assert.False(Slo.ShouldPage(slo: 0.999, longWindow: incidentHour, shortWindow: new WindowCounts(Good: 8_333, Total: 8_333), threshold: 14.4));
        Assert.True(Slo.ShouldPage(slo: 0.999, longWindow: incidentHour, shortWindow: new WindowCounts(Good: 8_100, Total: 8_333), threshold: 14.4));
        Assert.True(Slo.ShouldPage(slo: 0.999, longWindow: sixHours, shortWindow: thirtyMinutes, threshold: 6));
        Assert.False(Slo.ShouldPage(slo: 0.999, longWindow: sixHours, shortWindow: thirtyMinutes, threshold: 14.4));
        Assert.False(Slo.ShouldPage(slo: 0.999, longWindow: new WindowCounts(Good: 100_000, Total: 100_000), shortWindow: new WindowCounts(Good: 8_333, Total: 8_333), threshold: 0));
    }
}
