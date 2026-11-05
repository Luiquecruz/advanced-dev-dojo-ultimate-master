public enum OrderStatus { Pending, Paid, Shipped, Cancelled }

public sealed record Order(string Id, string Customer, OrderStatus Status, decimal Total);

public static class OrderReport
{
    public static IReadOnlyList<string> LargePaidOrderIds(IEnumerable<Order> orders, decimal minimum)
    {
        // TODO: Where, then OrderByDescending by total, then ThenBy id, then Select the id.
        return [];
    }

    public static IReadOnlyDictionary<string, decimal> RevenueByCustomer(IEnumerable<Order> orders)
    {
        // TODO: leave out cancelled orders, group by customer, sum each group.
        return new Dictionary<string, decimal>();
    }

    public static IReadOnlyDictionary<OrderStatus, int> CountByStatus(IEnumerable<Order> orders)
    {
        // TODO: count the orders per status.
        return new Dictionary<OrderStatus, int>();
    }

    public static decimal LargestTotal(IEnumerable<Order> orders)
    {
        // TODO: the largest total, or 0 when there are no orders.
        return orders.Max(order => order.Total);
    }
}
