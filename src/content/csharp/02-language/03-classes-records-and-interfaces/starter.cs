// TODO: two Sku values with the same text must be equal. Which kind of type gives you that?
public class Sku
{
    public Sku(string value) => Value = value;

    public string Value { get; }
}

public sealed class Product
{
    public Product(Sku sku, string name, decimal price)
    {
        Sku = sku;
        Name = name;
        Price = price;
    }

    public Sku Sku { get; }
    public string Name { get; }

    // TODO: only Product may set Price, and a negative price throws ArgumentOutOfRangeException.
    public decimal Price { get; set; }

    public void ChangePrice(decimal newPrice)
    {
        Price = newPrice;
    }
}

public interface IPriceRule
{
    decimal Apply(decimal price);
}

public sealed class PercentOff : IPriceRule
{
    private readonly decimal _percent;

    public PercentOff(decimal percent) => _percent = percent;

    // TODO: lower the price by the percentage, rounded to 2 decimal places.
    public decimal Apply(decimal price) => price;
}

public sealed class FloorAt : IPriceRule
{
    public FloorAt(decimal minimum)
    {
        // TODO: keep the minimum for Apply.
    }

    // TODO: never return less than the minimum.
    public decimal Apply(decimal price) => price;
}

public static class Checkout
{
    public static decimal Total(List<Product> products, List<IPriceRule> rules)
    {
        // TODO: run each product's price through every rule, in list order, and add the results.
        return 0m;
    }
}
