using System.Threading;

public interface ICommandHandler<in TCommand, TResult>
{
    Task<TResult> HandleAsync(TCommand command, CancellationToken ct);
}

public interface IQueryHandler<in TQuery, TResult>
{
    Task<TResult> HandleAsync(TQuery query, CancellationToken ct);
}

public interface IValidator<in T>
{
    IReadOnlyList<string> Validate(T value);
}

public sealed class ValidationException(IReadOnlyList<string> errors)
    : Exception("The command is invalid: " + string.Join("; ", errors))
{
    public IReadOnlyList<string> Errors { get; } = errors;
}

public sealed record PlaceOrder(Guid CustomerId, string Sku, int Quantity, decimal UnitPrice);

public sealed record GetOrderSummary(Guid OrderId);

public sealed record OrderSummary(Guid Id, string Sku, int Quantity, decimal Total, string Status);

public sealed class Order(Guid id, Guid customerId, string sku, int quantity, decimal unitPrice)
{
    public Guid Id { get; } = id;
    public Guid CustomerId { get; } = customerId;
    public string Sku { get; } = sku;
    public int Quantity { get; } = quantity;
    public decimal UnitPrice { get; } = unitPrice;
    public string Status { get; private set; } = "Draft";

    public void Place() => Status = "Placed";
}

public interface IOrderReader
{
    Order? Find(Guid id);
}

public sealed class OrderStore : IOrderReader
{
    private readonly Dictionary<Guid, Order> _orders = [];

    public int Count => _orders.Count;
    public int SaveCount { get; private set; }

    public void Add(Order order) => _orders.Add(order.Id, order);

    public Order? Find(Guid id) => _orders.GetValueOrDefault(id);

    public void SaveChanges() => SaveCount++;
}

public sealed class PlaceOrderHandler(OrderStore store) : ICommandHandler<PlaceOrder, Guid>
{
    public Task<Guid> HandleAsync(PlaceOrder command, CancellationToken ct)
    {
        // TODO: create the order with Guid.CreateVersion7(), place it, add it to the store, save once, return its id.
        throw new NotImplementedException();
    }
}

public sealed class GetOrderSummaryHandler(IOrderReader orders) : IQueryHandler<GetOrderSummary, OrderSummary?>
{
    public Task<OrderSummary?> HandleAsync(GetOrderSummary query, CancellationToken ct)
    {
        // TODO: find the order and return its summary, or null when there is none. A query changes nothing.
        throw new NotImplementedException();
    }
}

public sealed class PlaceOrderValidator : IValidator<PlaceOrder>
{
    public IReadOnlyList<string> Validate(PlaceOrder command)
    {
        // TODO: return one message per broken rule, each starting with the property name; an empty list when the command is valid.
        throw new NotImplementedException();
    }
}

public sealed class ValidationDecorator<TCommand, TResult>(
    ICommandHandler<TCommand, TResult> inner,
    IValidator<TCommand> validator) : ICommandHandler<TCommand, TResult>
{
    public async Task<TResult> HandleAsync(TCommand command, CancellationToken ct)
    {
        // TODO: validate the command; reject an invalid one with ValidationException, otherwise run the inner handler.
        return await inner.HandleAsync(command, ct);
    }
}
