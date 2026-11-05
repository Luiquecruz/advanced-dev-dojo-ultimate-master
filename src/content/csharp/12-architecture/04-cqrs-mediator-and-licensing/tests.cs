using System.Threading;
using Dojo;

public sealed class RecordingHandler : ICommandHandler<PlaceOrder, Guid>
{
    public static readonly Guid Result = new("0197a1b2-0000-7000-8000-0000000000aa");

    public int Calls { get; private set; }
    public PlaceOrder? Received { get; private set; }
    public CancellationToken ReceivedToken { get; private set; }

    public Task<Guid> HandleAsync(PlaceOrder command, CancellationToken ct)
    {
        Calls++;
        Received = command;
        ReceivedToken = ct;
        return Task.FromResult(Result);
    }
}

public static class CqrsTests
{
    private static readonly Guid Customer = new("0197a1b2-0000-7000-8000-000000000001");

    private static PlaceOrder ValidCommand() => new(Customer, "MUG", 3, 2.50m);

    [Test("PlaceOrderHandler stores one placed order, saves once and returns the new order's id")]
    public static async Task PlaceOrderStoresAndSaves()
    {
        var store = new OrderStore();
        Guid id = await new PlaceOrderHandler(store).HandleAsync(ValidCommand(), CancellationToken.None);

        Order order = Assert.NotNull(store.Find(id), "the returned id should find the stored order");
        Assert.Equal(1, store.Count);
        Assert.Equal(1, store.SaveCount);
        Assert.Equal("Placed", order.Status);
        Assert.Equal("MUG", order.Sku);
        Assert.Equal(Customer, order.CustomerId);
    }

    [Test("GetOrderSummaryHandler returns the summary with Total = Quantity x UnitPrice, null for an unknown id, and saves nothing")]
    public static async Task QueryReadsWithoutWriting()
    {
        var store = new OrderStore();
        Guid id = await new PlaceOrderHandler(store).HandleAsync(ValidCommand(), CancellationToken.None);
        var query = new GetOrderSummaryHandler(store);

        OrderSummary? summary = await query.HandleAsync(new GetOrderSummary(id), CancellationToken.None);
        Assert.Equal(new OrderSummary(id, "MUG", 3, 7.50m, "Placed"), summary);
        Assert.Null(await query.HandleAsync(new GetOrderSummary(Guid.NewGuid()), CancellationToken.None));
        Assert.Equal(1, store.SaveCount);
        Assert.Equal(1, store.Count);
    }

    [Test("PlaceOrderValidator reports every broken rule, each message starting with its property, and nothing for a valid command")]
    public static void ValidatorListsEveryProblem()
    {
        var validator = new PlaceOrderValidator();
        Assert.Equal(0, validator.Validate(ValidCommand()).Count);

        IReadOnlyList<string> errors = validator.Validate(new PlaceOrder(Guid.Empty, "  ", 0, 0m));
        Assert.Equal(4, errors.Count);
        string[] properties = ["CustomerId", "Sku", "Quantity", "UnitPrice"];
        foreach (string property in properties)
        {
            Assert.True(errors.Any(error => error.StartsWith(property, StringComparison.Ordinal)), $"expected a message that starts with {property}");
        }
        Assert.Equal(1, validator.Validate(ValidCommand() with { Quantity = -2 }).Count);
    }

    // beginner mistake: a decorator that calls the inner handler before validating, or validates and still calls it
    [Test("ValidationDecorator rejects an invalid command with ValidationException before the inner handler runs")]
    public static async Task DecoratorRejectsBeforeTheHandler()
    {
        var inner = new RecordingHandler();
        var decorated = new ValidationDecorator<PlaceOrder, Guid>(inner, new PlaceOrderValidator());

        var ex = await Assert.ThrowsAsync<ValidationException>(() => decorated.HandleAsync(ValidCommand() with { Sku = "" }, CancellationToken.None));
        Assert.Equal(1, ex.Errors.Count);
        Assert.True(ex.Errors[0].StartsWith("Sku", StringComparison.Ordinal), $"expected the Sku message, got \"{ex.Errors[0]}\"");
        Assert.Equal(0, inner.Calls);
    }

    [Test("ValidationDecorator passes a valid command and its token to the inner handler and returns its result unchanged")]
    public static async Task DecoratorPassesValidCommandsThrough()
    {
        var inner = new RecordingHandler();
        ICommandHandler<PlaceOrder, Guid> decorated = new ValidationDecorator<PlaceOrder, Guid>(inner, new PlaceOrderValidator());
        using var source = new CancellationTokenSource();

        Guid result = await decorated.HandleAsync(ValidCommand(), source.Token);
        Assert.Equal(RecordingHandler.Result, result);
        Assert.Equal(1, inner.Calls);
        Assert.Equal(ValidCommand(), inner.Received);
        Assert.True(inner.ReceivedToken == source.Token, "the decorator should pass the caller's token on");

        var store = new OrderStore();
        var real = new ValidationDecorator<PlaceOrder, Guid>(new PlaceOrderHandler(store), new PlaceOrderValidator());
        await Assert.ThrowsAsync<ValidationException>(() => real.HandleAsync(ValidCommand() with { UnitPrice = 0m }, CancellationToken.None));
        Assert.Equal(0, store.Count);
    }
}
