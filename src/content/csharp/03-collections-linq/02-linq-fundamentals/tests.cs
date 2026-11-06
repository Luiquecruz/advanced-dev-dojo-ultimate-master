using Dojo;

public static class OrderReportTests
{
    private static readonly Order[] Orders =
    [
        new("C-3", "ana", OrderStatus.Paid, 120m),
        new("A-1", "ben", OrderStatus.Paid, 80m),
        new("B-2", "ana", OrderStatus.Paid, 120m),
        new("D-4", "ben", OrderStatus.Cancelled, 500m),
        new("E-5", "cleo", OrderStatus.Pending, 40m),
        new("F-6", "ana", OrderStatus.Shipped, 15.5m),
        new("G-7", "dan", OrderStatus.Cancelled, 30m),
        new("H-8", "cleo", OrderStatus.Paid, 79.99m),
    ];

    [Test("LargePaidOrderIds keeps paid orders at or above the minimum")]
    public static void LargePaidOrdersFilter()
    {
        var ids = OrderReport.LargePaidOrderIds(Orders, 80m);

        Assert.Contains("A-1", ids, "an order of exactly the minimum counts");
        Assert.False(ids.Contains("H-8"), "79.99 is below the minimum of 80");
        Assert.False(ids.Contains("D-4"), "a cancelled order is not paid, however large");
        Assert.Equal(3, ids.Count);
    }

    [Test("LargePaidOrderIds lists the largest total first and breaks ties by id")]
    public static void LargePaidOrdersSort()
    {
        Assert.SequenceEqual(["B-2", "C-3", "A-1"], OrderReport.LargePaidOrderIds(Orders, 80m));
    }

    [Test("RevenueByCustomer sums each customer's orders, leaving out cancelled ones")]
    public static void RevenueByCustomer()
    {
        var revenue = OrderReport.RevenueByCustomer(Orders);

        Assert.Equal(255.5m, revenue["ana"]);
        Assert.Equal(80m, revenue["ben"]);
        Assert.Equal(119.99m, revenue["cleo"]);
        Assert.False(revenue.ContainsKey("dan"), "dan has only a cancelled order");
    }

    [Test("CountByStatus counts the orders of each status that occurs")]
    public static void CountByStatus()
    {
        var counts = OrderReport.CountByStatus(Orders);

        Assert.Equal(4, counts[OrderStatus.Paid]);
        Assert.Equal(2, counts[OrderStatus.Cancelled]);
        Assert.Equal(1, counts[OrderStatus.Pending]);
        Assert.Equal(1, counts[OrderStatus.Shipped]);
        Assert.False(OrderReport.CountByStatus(Orders[..1]).ContainsKey(OrderStatus.Pending), "a status with no orders does not appear");
    }

    [Test("LargestTotal returns the largest total")]
    public static void LargestTotal()
    {
        Assert.Equal(500m, OrderReport.LargestTotal(Orders));
        Assert.Equal(15.5m, OrderReport.LargestTotal([Orders[5]]));
    }

    // beginner mistake: Max on an empty sequence throws InvalidOperationException
    [Test("LargestTotal of no orders is 0 instead of an exception")]
    public static void LargestTotalOfNothing()
    {
        Assert.Equal(0m, OrderReport.LargestTotal([]));
    }
}
