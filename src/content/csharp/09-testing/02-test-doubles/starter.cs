using System.Threading;

public interface IStockGateway
{
    Task<int> GetAvailableAsync(string sku, CancellationToken cancellationToken);
    Task ReserveAsync(string sku, int quantity, CancellationToken cancellationToken);
    Task ReleaseAsync(string sku, int quantity, CancellationToken cancellationToken);
}

public sealed class Hold(string sku, int quantity, DateTimeOffset createdAt)
{
    public string Sku { get; } = sku;
    public int Quantity { get; } = quantity;
    public DateTimeOffset CreatedAt { get; } = createdAt;
    public bool IsReleased { get; private set; }

    public void MarkReleased() => IsReleased = true;
}

public sealed class FakeStockGateway : IStockGateway
{
    public List<(string Sku, int Quantity)> Reservations { get; } = [];
    public List<(string Sku, int Quantity)> Releases { get; } = [];

    // TODO: keep the stock per SKU and the SKUs that fail.
    public FakeStockGateway With(string sku, int quantity) => throw new NotImplementedException();

    public FakeStockGateway FailingOn(string sku) => throw new NotImplementedException();

    public Task<int> GetAvailableAsync(string sku, CancellationToken cancellationToken) => throw new NotImplementedException();

    public Task ReserveAsync(string sku, int quantity, CancellationToken cancellationToken) => throw new NotImplementedException();

    public Task ReleaseAsync(string sku, int quantity, CancellationToken cancellationToken) => throw new NotImplementedException();
}

public sealed class ManualTimeProvider(DateTimeOffset start) : TimeProvider
{
    // TODO: return the manual time, which starts at `start` and moves only in Advance.
    public override DateTimeOffset GetUtcNow() => DateTimeOffset.UtcNow;

    public void Advance(TimeSpan duration)
    {
    }
}

public sealed class ReservationService(IStockGateway stock, TimeProvider clock)
{
    public static readonly TimeSpan HoldDuration = TimeSpan.FromMinutes(15);
    private readonly List<Hold> _holds = [];

    public async Task<Hold?> HoldAsync(string sku, int quantity, CancellationToken cancellationToken)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(quantity);
        if (await stock.GetAvailableAsync(sku, cancellationToken) < quantity)
        {
            return null;
        }

        await stock.ReserveAsync(sku, quantity, cancellationToken);
        // TODO: this reads the system clock, so a test cannot control it.
        var hold = new Hold(sku, quantity, DateTimeOffset.UtcNow);
        _holds.Add(hold);
        return hold;
    }

    public async Task<int> ExpireHoldsAsync(CancellationToken cancellationToken)
    {
        // TODO: this reads the system clock too; check hold ages with the injected clock.
        DateTimeOffset now = DateTimeOffset.UtcNow;
        int released = 0;
        foreach (Hold hold in _holds)
        {
            if (!hold.IsReleased && now - hold.CreatedAt >= HoldDuration)
            {
                await stock.ReleaseAsync(hold.Sku, hold.Quantity, cancellationToken);
                hold.MarkReleased();
                released++;
            }
        }
        return released;
    }
}
