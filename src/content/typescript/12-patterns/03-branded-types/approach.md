1. Declare `Brand<T, Name>` as an intersection with a `readonly [brand]: Name` property.
2. Redefine `UserId`, `OrderId`, `Email` and `Cents` with `Brand`.
3. In each smart constructor, normalize if needed, validate, throw the required error, and only then cast with `as`.
4. Leave `sendInvoice` unchanged; its parameters now reject unbranded or wrongly branded values.
