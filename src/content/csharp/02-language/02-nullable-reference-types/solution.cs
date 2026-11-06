public sealed class Customer
{
    public Customer(string id, string name, string? email = null)
    {
        ArgumentNullException.ThrowIfNull(id);
        ArgumentNullException.ThrowIfNull(name);
        Id = id;
        Name = name;
        Email = email;
    }

    public string Id { get; }
    public string Name { get; }
    public string? Email { get; }
    public string? Nickname { get; set; }
}

public sealed class CustomerDirectory
{
    private readonly Dictionary<string, Customer> _customers = new();

    public void Add(Customer customer) => _customers[customer.Id] = customer;

    public Customer? Find(string id) => _customers.TryGetValue(id, out var customer) ? customer : null;

    public string DisplayName(string id)
    {
        var customer = Find(id);
        return customer?.Nickname ?? customer?.Name ?? "guest";
    }

    public int EmailLength(string id) => Find(id)?.Email?.Length ?? 0;
}
