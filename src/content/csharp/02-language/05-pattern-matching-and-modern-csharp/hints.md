Start with the shape: `shipment switch { null => ..., Letter { Grams: <= 20 } => 1.10m, Letter => 2.50m, ... }`. A type pattern with a property pattern checks the type and a property in one arm, and a later arm with the bare type catches the rest of that type.
---
`>= 10m` includes 10 and `> 10m` does not. The heavy-parcel arm must come before the `{ Country: "NL" or "BE" }` arm, or a 12 kg parcel to NL gets the cheap rate. A `throw` expression can be the result of an arm: `null => throw new ArgumentNullException(nameof(shipment))`.
---
In `DescribeRoute`, give each arm one exact shape (`[var only]`, `[var from, var to]`, `[var from, var via, var to]`) and end with `[var from, .. var middle, var to]`, where `middle` is an array whose `Length` is the number of stops in between. In `Zone`, the parameters `name` and `codes` are in scope in every member: `Name => name;` and a `foreach` over `codes` with `string.Equals(code, country, StringComparison.OrdinalIgnoreCase)`.
