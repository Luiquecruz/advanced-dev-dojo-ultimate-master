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
        // TODO: lower the caller's price by `percent` percent, rounded to 2 decimal places.
        var copy = price;
        copy.Amount = Math.Round(copy.Amount * (100 - percent) / 100, 2);
    }

    public static void RaiseAll(List<Money> prices, decimal amount)
    {
        // TODO: add `amount` to every price stored in the list.
        foreach (var price in prices)
        {
            var raised = price;
            raised.Amount += amount;
        }
    }

    public static void AddGift(List<string> skus)
    {
        // TODO: the caller's list must contain "GIFT-01" exactly once afterwards.
        // [.. skus, "GIFT-01"] builds a new list with every item of skus plus one more (lesson 02/05).
        skus = [.. skus, "GIFT-01"];
    }

    public static bool SameCart(Cart first, Cart second)
    {
        // TODO: true only when both variables refer to one cart object.
        return first.Skus.Count == second.Skus.Count;
    }
}
