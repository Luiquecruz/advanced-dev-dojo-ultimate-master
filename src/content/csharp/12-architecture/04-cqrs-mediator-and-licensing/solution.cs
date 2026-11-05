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
        ct.ThrowIfCancellationRequested();
        var order = new Order(Guid.CreateVersion7(), command.CustomerId, command.Sku, command.Quantity, command.UnitPrice);
        order.Place();
        store.Add(order);
        store.SaveChanges();
        return Task.FromResult(order.Id);
    }
}

public sealed class GetOrderSummaryHandler(IOrderReader orders) : IQueryHandler<GetOrderSummary, OrderSummary?>
{
    public Task<OrderSummary?> HandleAsync(GetOrderSummary query, CancellationToken ct)
    {
        Order? order = orders.Find(query.OrderId);
        OrderSummary? summary = order is null
            ? null
            : new OrderSummary(order.Id, order.Sku, order.Quantity, order.Quantity * order.UnitPrice, order.Status);
        return Task.FromResult(summary);
    }
}

public sealed class PlaceOrderValidator : IValidator<PlaceOrder>
{
    public IReadOnlyList<string> Validate(PlaceOrder command)
    {
        var errors = new List<string>();
        if (command.CustomerId == Guid.Empty)
        {
            errors.Add("CustomerId is required.");
        }
        if (string.IsNullOrWhiteSpace(command.Sku))
        {
            errors.Add("Sku is required.");
        }
        if (command.Quantity <= 0)
        {
            errors.Add("Quantity must be greater than 0.");
        }
        if (command.UnitPrice <= 0)
        {
            errors.Add("UnitPrice must be greater than 0.");
        }
        return errors;
    }
}

public sealed class ValidationDecorator<TCommand, TResult>(
    ICommandHandler<TCommand, TResult> inner,
    IValidator<TCommand> validator) : ICommandHandler<TCommand, TResult>
{
    public async Task<TResult> HandleAsync(TCommand command, CancellationToken ct)
    {
        IReadOnlyList<string> errors = validator.Validate(command);
        if (errors.Count > 0)
        {
            throw new ValidationException(errors);
        }
        return await inner.HandleAsync(command, ct);
    }
}
