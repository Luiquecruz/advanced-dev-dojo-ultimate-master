1. Decide what each type models: `Sku` is data compared by value (a `record`), `Product` has behavior and a rule to protect (a `class`), and a price rule is a capability that several types share (an `interface`).
2. Turn `Sku` into a record. Run the tests: the equality test is the one a plain class fails, because a class compares identity.
3. Give `Price` a `private set` that throws for a negative value, and route the constructor and `ChangePrice` through it. A setter that throws before assigning keeps the old price.
4. Finish `PercentOff.Apply` with `Math.Round(price * (100 - percent) / 100, 2)` and give `FloorAt` a field for its minimum and an `Apply` built on `Math.Max`.
5. In `Checkout.Total`, loop over the products, fold each price through the rules in order, and add it to the total. The two orders of the same rules give different totals, which the tests check.
