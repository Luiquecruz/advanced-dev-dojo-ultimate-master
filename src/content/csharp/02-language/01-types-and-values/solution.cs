public struct Money
{
    public decimal Amount;
    public string Currency;
}

public class Cart
{
    public List<string> Skus { get; } = [];
}

public static class Pricing
{
    public static void Discount(ref Money price, decimal percent)
    {
        price.Amount = Math.Round(price.Amount * (100 - percent) / 100, 2);
    }

    public static void RaiseAll(List<Money> prices, decimal amount)
    {
        for (var index = 0; index < prices.Count; index++)
        {
            var price = prices[index];
            price.Amount += amount;
            prices[index] = price;
        }
    }

    public static void AddGift(List<string> skus)
    {
        if (!skus.Contains("GIFT-01"))
        {
            skus.Add("GIFT-01");
        }
    }

    public static bool SameCart(Cart first, Cart second) => ReferenceEquals(first, second);
}
