public abstract record Shipment;

public sealed record Letter(int Grams) : Shipment;

public sealed record Parcel(decimal WeightKg, string Country) : Shipment;

public sealed record Pallet(int Count) : Shipment;

public static class Shipping
{
    public static decimal Cost(Shipment? shipment) => shipment switch
    {
        null => throw new ArgumentNullException(nameof(shipment)),
        Letter { Grams: <= 20 } => 1.10m,
        Letter => 2.50m,
        Parcel { WeightKg: >= 10m } => 15m,
        Parcel { Country: "NL" or "BE" } => 4.95m,
        Parcel => 7.50m,
        Pallet { Count: > 0 } pallet => 60m * pallet.Count,
        _ => throw new ArgumentException("Unknown shipment.", nameof(shipment)),
    };

    public static string DescribeRoute(string[] stops) => stops switch
    {
        [] => "no stops",
        [var only] => $"direct to {only}",
        [var from, var to] => $"{from} to {to}",
        [var from, var via, var to] => $"{from} to {to} via {via}",
        [var from, .. var middle, var to] => $"{from} to {to} via {middle.Length} stops",
    };
}

public sealed class Zone(string name, params string[] codes)
{
    public string Name => name;

    public bool Covers(string country)
    {
        foreach (var code in codes)
        {
            if (string.Equals(code, country, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }
        return false;
    }
}
