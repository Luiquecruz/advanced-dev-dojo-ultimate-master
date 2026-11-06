A `class` compares identity with `==`: two `new Sku("BAG-01")` objects are two objects. Which kind of type generates value equality for you? Changing one keyword (or using the positional form `record Sku(string Value);`) is enough.
---
Put the validation in one place. With the C# 14 `field` keyword, `private set => field = value >= 0m ? value : throw new ArgumentOutOfRangeException(nameof(value));` guards every assignment, and both the constructor and `ChangePrice` can simply assign `Price`.
---
`FloorAt` stores the minimum in a `private readonly` field, the way `PercentOff` stores its percentage; `Math.Max(price, _minimum)` is the whole rule. In `Checkout.Total`, keep a running `price` per product and reassign it inside the inner `foreach` over the rules: `price = rule.Apply(price);`.
