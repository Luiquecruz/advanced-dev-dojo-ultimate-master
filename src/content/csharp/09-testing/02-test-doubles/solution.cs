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
    private readonly Dictionary<string, int> _stock = new();
    private readonly HashSet<string> _failing = new();

    public List<(string Sku, int Quantity)> Reservations { get; } = [];
    public List<(string Sku, int Quantity)> Releases { get; } = [];

    public FakeStockGateway With(string sku, int quantity)
    {
        _stock[sku] = quantity;
        return this;
    }

    public FakeStockGateway FailingOn(string sku)
    {
        _failing.Add(sku);
        return this;
    }

    public Task<int> GetAvailableAsync(string sku, CancellationToken cancellationToken) =>
        Task.FromResult(_stock.GetValueOrDefault(sku));

    public Task ReserveAsync(string sku, int quantity, CancellationToken cancellationToken)
    {
        if (_failing.Contains(sku))
        {
            throw new InvalidOperationException($"The stock service is unavailable for {sku}.");
        }

        _stock[sku] = _stock.GetValueOrDefault(sku) - quantity;
        Reservations.Add((sku, quantity));
        return Task.CompletedTask;
    }

    public Task ReleaseAsync(string sku, int quantity, CancellationToken cancellationToken)
    {
        _stock[sku] = _stock.GetValueOrDefault(sku) + quantity;
        Releases.Add((sku, quantity));
        return Task.CompletedTask;
    }
}

public sealed class ManualTimeProvider(DateTimeOffset start) : TimeProvider
{
    private DateTimeOffset _now = start;

    public override DateTimeOffset GetUtcNow() => _now;

    public void Advance(TimeSpan duration) => _now += duration;
}

public sealed class ReservationService(IStockGateway stock, TimeProvider clock)
{
    public static readonly TimeSpan HoldDuration = TimeSpan.FromMinutes(15);
    private readonly List<Hold> _holds = [];

    public async Task<Hold?> HoldAsync(string sku, int quantity, CancellationToken cancellationToken)
    {
        if (await stock.GetAvailableAsync(sku, cancellationToken) < quantity)
        {
            return null;
        }

        await stock.ReserveAsync(sku, quantity, cancellationToken);
        var hold = new Hold(sku, quantity, clock.GetUtcNow());
        _holds.Add(hold);
        return hold;
    }

    public async Task<int> ExpireHoldsAsync(CancellationToken cancellationToken)
    {
        DateTimeOffset now = clock.GetUtcNow();
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
