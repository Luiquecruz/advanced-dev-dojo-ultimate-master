Finish the four methods of `Pricing` in `Program.cs`. `Money` is a mutable `struct` (a value type) and `Cart` is a `class` (a reference type); do not change either of them. Each method is about one question: does this line copy the data or share it?

## `Discount(ref Money price, decimal percent)`

Lower the **caller's** price by `percent` percent and round the result to 2 decimal places with `Math.Round(value, 2)`. `price` is a `ref` parameter, so the method receives the caller's variable itself. 50.00 with 10 becomes 45.00; 19.99 with 15 becomes 16.99. The currency stays the same.

## `RaiseAll(List<Money> prices, decimal amount)`

Add `amount` to the `Amount` of every price **stored in the list**. Reading `prices[index]` gives you a copy of the struct, so changing that copy alone changes nothing in the list: write the changed copy back with `prices[index] = ...`.

## `AddGift(List<string> skus)`

Make sure the caller's list contains `"GIFT-01"`: add it when it is missing, and do not add it a second time. The list is a reference type, so the method and the caller share it.

## `SameCart(Cart first, Cart second)`

Return `true` only when both variables refer to **one** cart object. Two different carts that hold the same SKUs are not the same cart.
