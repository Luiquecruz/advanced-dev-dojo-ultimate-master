1. Write `Cost` as an expression-bodied method, `=> shipment switch { ... }`, with one arm per row of the table, in the table's order.
2. Use type patterns with property patterns for each record (`Letter { Grams: <= 20 }`, `Parcel { WeightKg: >= 10m }`, `Parcel { Country: "NL" or "BE" }`), followed by the bare type for the remaining cases of that type.
3. Check the boundaries the tests pin down: exactly 20 g is a small letter and exactly 10 kg is a heavy parcel. Both need the inclusive operators `<=` and `>=`.
4. Give the pallet arm a designation (`Pallet { Count: > 0 } pallet`) so its result can use `pallet.Count`, and finish with `_ => throw new ArgumentException(...)` so a pallet with no count and any future shipment type fail loudly.
5. Write `DescribeRoute` with list patterns from the shortest shape to the slice, and finish `Zone` by reading the primary constructor parameters inside `Name` and `Covers`.
