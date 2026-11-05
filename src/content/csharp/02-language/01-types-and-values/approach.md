1. Sort the four methods by what crosses the method boundary: `Discount` gets the caller's variable (`ref`), `RaiseAll` gets a shared list of copied-on-read structs, `AddGift` gets a shared list, `SameCart` gets two references.
2. `Discount`: compute `price.Amount * (100 - percent) / 100`, round it to 2 places and assign it to `price.Amount`. Because `price` is `ref`, the caller's variable changes; the currency field is untouched.
3. `RaiseAll`: loop with `for` over the indexes. Read `prices[index]` into a local, add `amount` to its `Amount`, and write the local back to `prices[index]`. Without that last line every change is lost, which is the trap of this lesson.
4. `AddGift`: check `Contains("GIFT-01")` and call `Add` on the list you received. Do not assign a new list to the parameter: the caller would never see it.
5. `SameCart`: compare identity with `ReferenceEquals`, not the contents. Run the tests and check that two carts with equal SKUs still count as two carts.
