# Order report

A shop wants a few numbers about its orders. Complete the static class `OrderReport` with one LINQ query per method. The types are given:

```csharp
public enum OrderStatus { Pending, Paid, Shipped, Cancelled }
public sealed record Order(string Id, string Customer, OrderStatus Status, decimal Total);
```

- `IReadOnlyList<string> LargePaidOrderIds(IEnumerable<Order> orders, decimal minimum)` returns the ids of the `Paid` orders whose `Total` is **at least** `minimum`, largest total first. Orders with the same total are listed by id in ordinal order (`"A-1"` before `"B-2"`).
- `IReadOnlyDictionary<string, decimal> RevenueByCustomer(IEnumerable<Order> orders)` returns the sum of `Total` per customer, leaving out `Cancelled` orders. A customer whose orders are all cancelled does not appear.
- `IReadOnlyDictionary<OrderStatus, int> CountByStatus(IEnumerable<Order> orders)` returns how many orders have each status. A status with no orders does not appear.
- `decimal LargestTotal(IEnumerable<Order> orders)` returns the largest `Total`, and `0` when there are no orders at all.

None of the methods changes the input.
