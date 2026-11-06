public enum OrderStatus { Pending, Paid, Shipped, Cancelled }

public sealed record Order(string Id, string Customer, OrderStatus Status, decimal Total);

public static class OrderReport
{
    public static IReadOnlyList<string> LargePaidOrderIds(IEnumerable<Order> orders, decimal minimum) =>
        orders
            .Where(order => order.Status == OrderStatus.Paid && order.Total >= minimum)
            .OrderByDescending(order => order.Total)
            .ThenBy(order => order.Id, StringComparer.Ordinal)
            .Select(order => order.Id)
            .ToList();

    public static IReadOnlyDictionary<string, decimal> RevenueByCustomer(IEnumerable<Order> orders) =>
        orders
            .Where(order => order.Status != OrderStatus.Cancelled)
            .GroupBy(order => order.Customer)
            .ToDictionary(group => group.Key, group => group.Sum(order => order.Total));

    public static IReadOnlyDictionary<OrderStatus, int> CountByStatus(IEnumerable<Order> orders) =>
        orders
            .CountBy(order => order.Status)
            .ToDictionary(pair => pair.Key, pair => pair.Value);

    public static decimal LargestTotal(IEnumerable<Order> orders) =>
        orders.Select(order => order.Total).DefaultIfEmpty().Max();
}
