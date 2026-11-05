public record Sku(string Value);

public sealed class Product
{
    public Product(Sku sku, string name, decimal price)
    {
        Sku = sku;
        Name = name;
        ChangePrice(price);
    }

    public Sku Sku { get; }
    public string Name { get; }

    public decimal Price
    {
        get;
        private set => field = value >= 0m ? value : throw new ArgumentOutOfRangeException(nameof(value), "A price cannot be negative.");
    }

    public void ChangePrice(decimal newPrice) => Price = newPrice;
}

public interface IPriceRule
{
    decimal Apply(decimal price);
}

public sealed class PercentOff : IPriceRule
{
    private readonly decimal _percent;

    public PercentOff(decimal percent) => _percent = percent;

    public decimal Apply(decimal price) => Math.Round(price * (100 - _percent) / 100, 2);
}

public sealed class FloorAt : IPriceRule
{
    private readonly decimal _minimum;

    public FloorAt(decimal minimum) => _minimum = minimum;

    public decimal Apply(decimal price) => Math.Max(price, _minimum);
}

public static class Checkout
{
    public static decimal Total(List<Product> products, List<IPriceRule> rules)
    {
        var total = 0m;
        foreach (var product in products)
        {
            var price = product.Price;
            foreach (var rule in rules)
            {
                price = rule.Apply(price);
            }
            total += price;
        }
        return total;
    }
}
