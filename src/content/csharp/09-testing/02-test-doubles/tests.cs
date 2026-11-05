using Dojo;
using System.Threading;

public static class TestDoubleTests
{
    private static readonly DateTimeOffset Start = new(2026, 11, 5, 9, 0, 0, TimeSpan.Zero);

    [Test("FakeStockGateway returns the seeded stock, 0 for an unknown SKU, and less after a reservation")]
    public static async Task FakeKeepsStock()
    {
        var stock = new FakeStockGateway().With("SKU-1", 5).With("SKU-2", 1);
        Assert.Equal(5, await stock.GetAvailableAsync("SKU-1", CancellationToken.None));
        Assert.Equal(0, await stock.GetAvailableAsync("NOPE", CancellationToken.None));

        await stock.ReserveAsync("SKU-1", 2, CancellationToken.None);
        Assert.Equal(3, await stock.GetAvailableAsync("SKU-1", CancellationToken.None));
        Assert.Equal(1, await stock.GetAvailableAsync("SKU-2", CancellationToken.None));
    }

    [Test("FakeStockGateway records reservations and releases in order")]
    public static async Task FakeRecordsCalls()
    {
        var stock = new FakeStockGateway().With("SKU-1", 5).With("SKU-2", 5);
        await stock.ReserveAsync("SKU-1", 2, CancellationToken.None);
        await stock.ReserveAsync("SKU-2", 1, CancellationToken.None);
        await stock.ReleaseAsync("SKU-1", 2, CancellationToken.None);

        Assert.SequenceEqual([("SKU-1", 2), ("SKU-2", 1)], stock.Reservations);
        Assert.SequenceEqual([("SKU-1", 2)], stock.Releases);
        Assert.Equal(5, await stock.GetAvailableAsync("SKU-1", CancellationToken.None));
    }

    [Test("FailingOn makes ReserveAsync throw InvalidOperationException for that SKU and change nothing")]
    public static async Task FakeFailsOnDemand()
    {
        var stock = new FakeStockGateway().With("SKU-1", 5).With("SKU-2", 5).FailingOn("SKU-2");
        await Assert.ThrowsAsync<InvalidOperationException>(() => stock.ReserveAsync("SKU-2", 1, CancellationToken.None));
        await stock.ReserveAsync("SKU-1", 1, CancellationToken.None);

        Assert.SequenceEqual([("SKU-1", 1)], stock.Reservations);
        Assert.Equal(5, await stock.GetAvailableAsync("SKU-2", CancellationToken.None));
    }

    [Test("ManualTimeProvider starts at the given time and moves only when advanced")]
    public static void ManualClock()
    {
        var manual = new ManualTimeProvider(Start);
        TimeProvider clock = manual;
        Assert.Equal(Start, clock.GetUtcNow());
        Assert.Equal(Start, clock.GetUtcNow());

        manual.Advance(TimeSpan.FromMinutes(10));
        Assert.Equal(Start.AddMinutes(10), clock.GetUtcNow());
    }

    // beginner mistake: reading DateTimeOffset.UtcNow in the service instead of the injected TimeProvider
    [Test("ReservationService keeps a hold at 14 minutes and releases it at 15, using the injected clock")]
    public static async Task ExpiresWithInjectedClock()
    {
        var clock = new ManualTimeProvider(Start);
        var stock = new FakeStockGateway().With("SKU-1", 5);
        var service = new ReservationService(stock, clock);
        Hold hold = (await service.HoldAsync("SKU-1", 2, CancellationToken.None))!;
        Assert.Equal(Start, hold.CreatedAt);

        clock.Advance(TimeSpan.FromMinutes(14));
        Assert.Equal(0, await service.ExpireHoldsAsync(CancellationToken.None));
        Assert.False(hold.IsReleased, "a 14-minute-old hold is kept");

        clock.Advance(TimeSpan.FromMinutes(1));
        Assert.Equal(1, await service.ExpireHoldsAsync(CancellationToken.None));
        Assert.True(hold.IsReleased, "a 15-minute-old hold is released");
        Assert.SequenceEqual([("SKU-1", 2)], stock.Releases);
    }

    [Test("HoldAsync refuses more than the available stock and reserves nothing")]
    public static async Task RefusesWithoutStock()
    {
        var stock = new FakeStockGateway().With("SKU-1", 1);
        var service = new ReservationService(stock, new ManualTimeProvider(Start));

        Assert.Null(await service.HoldAsync("SKU-1", 2, CancellationToken.None));
        Assert.Equal(0, stock.Reservations.Count);
    }
}
