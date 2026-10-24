Invoices were sent to the wrong customers because ids, emails and amounts are plain `string`/`number` aliases. Make them nominal.

1. Define a generic `Brand<T, Name extends string>` using the provided `declare const brand: unique symbol`, then:
   - `UserId = Brand<string, "UserId">`
   - `OrderId = Brand<string, "OrderId">`
   - `Email = Brand<string, "Email">`
   - `Cents = Brand<number, "Cents">`
2. Implement the smart constructors (the only places allowed to use `as`):
   - `toUserId(raw)`: accepts strings matching `/^usr_\w+$/`, otherwise throws `TypeError("Invalid user id")`
   - `toEmail(raw)`: trims and lowercases, then requires `/^[^@\s]+@[^@\s]+\.[^@\s]+$/`, otherwise throws `TypeError("Invalid email")`
   - `toCents(amount)`: accepts non-negative integers, otherwise throws `RangeError("Invalid amount")`
3. Keep `sendInvoice(to: Email, userId: UserId, amount: Cents): string`, returning `"<userId> <email> <amount>"`.

Plain strings and numbers, and brands of the wrong kind, must be rejected by the compiler.
