public abstract record Shipment;

public sealed record Letter(int Grams) : Shipment;

public sealed record Parcel(decimal WeightKg, string Country) : Shipment;

public sealed record Pallet(int Count) : Shipment;

public static class Shipping
{
    public static decimal Cost(Shipment? shipment)
    {
        // TODO: one switch expression with type, property and relational patterns (rules in the challenge).
        return 0m;
    }

    public static string DescribeRoute(string[] stops)
    {
        // TODO: one switch expression with list patterns.
        return "";
    }
}

public sealed class Zone(string name, params string[] codes)
{
    // TODO: expose the name given to the primary constructor.
    public string Name => "";

    // TODO: true when one of the codes equals the country, ignoring case.
    public bool Covers(string country) => false;
}
