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
        if (total == 0)
        {
            return 1;
        }
        return good / total;
    }

    public static ErrorBudget ErrorBudget(double slo, double total, double bad)
    {
        var allowedBad = (1 - slo) * total;
        var remaining = allowedBad - bad;
        if (allowedBad == 0)
        {
            return new ErrorBudget(allowedBad, remaining, bad == 0 ? 0 : double.PositiveInfinity);
        }
        return new ErrorBudget(allowedBad, remaining, bad / allowedBad);
    }

    public static double BurnRate(double slo, double good, double total)
    {
        if (total == 0)
        {
            return 0;
        }
        var errorRate = (total - good) / total;
        return errorRate / (1 - slo);
    }

    public static bool ShouldPage(double slo, WindowCounts longWindow, WindowCounts shortWindow, double threshold)
    {
        var longBurn = BurnRate(slo, longWindow.Good, longWindow.Total);
        var shortBurn = BurnRate(slo, shortWindow.Good, shortWindow.Total);
        return longBurn > threshold && shortBurn > threshold;
    }
}
