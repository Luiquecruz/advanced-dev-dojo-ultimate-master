Model a small catalog in `Program.cs` with the four kinds of type from this lesson. Use ordinary constructors (primary constructors on classes come in lesson 05). A positional `record` declaration is fine.

## `Sku`

A SKU is plain data: two `Sku` values built from the same text must be equal with `==` and with `Equals`. Keep the constructor `new Sku("BAG-01")` and the `Value` property.

## `Product`

`Product(Sku sku, string name, decimal price)` with read-only `Sku` and `Name`. `Price` can be read by anyone but set only inside `Product` (a `private set` accessor). A negative price, in the constructor or in `ChangePrice(decimal newPrice)`, throws `ArgumentOutOfRangeException` and leaves the old price in place. `0` is a valid price.

## `IPriceRule`, `PercentOff` and `FloorAt`

`IPriceRule` declares `decimal Apply(decimal price)`. Both rules implement it:

- `PercentOff(decimal percent)` lowers the price by that percentage, rounded to 2 decimal places with `Math.Round(value, 2)`: 19.99 with 15 becomes 16.99.
- `FloorAt(decimal minimum)` never returns less than `minimum`: 7.5 with a floor of 10 becomes 10, and 12 stays 12.

## `Checkout.Total(List<Product> products, List<IPriceRule> rules)`

For each product, pass its price through every rule **in list order** (the output of one rule is the input of the next), then add the results. With no rules the total is the sum of the prices; with no products it is `0`.
