public sealed class Customer
{
    public Customer(string id, string name, string? email = null)
    {
        // TODO: reject a null id or name with ArgumentNullException before storing anything.
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

    public Customer? Find(string id)
    {
        // TODO: return null when no customer has this id.
        return _customers[id];
    }

    public string DisplayName(string id)
    {
        // TODO: the nickname, else the name, else "guest" when the customer is missing.
        return "guest";
    }

    public int EmailLength(string id)
    {
        // TODO: the length of the email, or 0 when the customer or the email is missing.
        return 0;
    }
}
