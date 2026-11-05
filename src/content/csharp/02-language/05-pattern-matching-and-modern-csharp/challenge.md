Write the shipping rules of a small shop in `Program.cs` with switch expressions and patterns, and finish a `Zone` class that receives its data through a primary constructor. The shipment records are given; do not change them.

## `Shipping.Cost(Shipment? shipment)`

One `switch` expression. The first matching arm wins, so the order of the rules below matters:

| Shipment | Cost |
| --- | --- |
| `null` | throw `ArgumentNullException` |
| `Letter` up to and including 20 grams | 1.10 |
| any other `Letter` | 2.50 |
| `Parcel` of **10 kg or more**, whatever the country | 15.00 |
| any other `Parcel` to `"NL"` or `"BE"` | 4.95 |
| any other `Parcel` | 7.50 |
| `Pallet` with a `Count` above 0 | 60.00 per pallet |
| anything else, such as a `Pallet` with `Count` 0 | throw `ArgumentException` |

## `Shipping.DescribeRoute(string[] stops)`

One `switch` expression with list patterns:

- `[]` gives `"no stops"`.
- One stop gives `"direct to Lisbon"`.
- Two stops give `"Amsterdam to Lisbon"`.
- Three stops give `"Amsterdam to Lisbon via Paris"`.
- More stops give `"Amsterdam to Lisbon via 3 stops"`, counting the stops between the first and the last.

## `Zone(string name, params string[] codes)`

The class header already declares a primary constructor, so `new Zone("Benelux", "NL", "BE", "LU")` works. `Name` returns the name. `Covers(string country)` returns `true` when one of the codes equals `country`, ignoring case. A zone with no codes covers nothing.
