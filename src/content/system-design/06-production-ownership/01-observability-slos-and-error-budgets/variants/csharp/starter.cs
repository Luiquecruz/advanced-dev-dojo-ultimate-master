// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
const double slo = 0.999;
var month = Slo.ErrorBudget(slo, total: 2_000_000, bad: 600);
Console.WriteLine($"budget: {month.AllowedBad:F0} bad requests, {month.Remaining:F0} left, {month.ConsumedRatio * 100:F1}% consumed");
var lastHour = new WindowCounts(Good: 9_850, Total: 10_000);
var lastFiveMinutes = new WindowCounts(Good: 820, Total: 833);
Console.WriteLine($"burn rate: {Slo.BurnRate(slo, lastHour.Good, lastHour.Total):F1} over 1 hour, {Slo.BurnRate(slo, lastFiveMinutes.Good, lastFiveMinutes.Total):F1} over 5 minutes");
Console.WriteLine($"page: {Slo.ShouldPage(slo, lastHour, lastFiveMinutes, threshold: 14.4)}");

public record WindowCounts(double Good, double Total);

public record ErrorBudget(double AllowedBad, double Remaining, double ConsumedRatio);

public static class Slo
{
    public static double Availability(double good, double total)
    {
        // TODO: a window without requests (total 0) had no failure: return 1
        return good / total;
    }

    public static ErrorBudget ErrorBudget(double slo, double total, double bad)
    {
        // TODO: allowedBad = (1 - slo) * total, not rounded, and remaining = allowedBad - bad
        // TODO: consumedRatio = bad / allowedBad; when allowedBad is 0: 0 without bad events, double.PositiveInfinity with any
        return new ErrorBudget(0, 0, 0);
    }

    public static double BurnRate(double slo, double good, double total)
    {
        // TODO: divide the error rate of the window by the error rate the SLO allows (1 - slo); an empty window burns 0
        return total - good;
    }

    public static bool ShouldPage(double slo, WindowCounts longWindow, WindowCounts shortWindow, double threshold)
    {
        // TODO: page only when the burn rate of both windows is greater than threshold
        return BurnRate(slo, shortWindow.Good, shortWindow.Total) > threshold;
    }
}
