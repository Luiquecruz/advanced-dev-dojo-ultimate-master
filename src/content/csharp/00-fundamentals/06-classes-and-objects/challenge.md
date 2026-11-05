Model a bank account as a class, and a traffic light as an enum. The starter already declares both types; complete them.

## `BankAccount`

- `BankAccount(string owner)` creates an account for `owner` with a balance of `0`.
- `string Owner { get; }` is the owner's name, set by the constructor.
- `decimal Balance` can be read by any code, but only the account itself may change it: from outside the class, `account.Balance = 100m` must not compile. The tests check that `Balance` has no public setter.
- `bool Deposit(decimal amount)` adds `amount` and returns `true`. An amount of `0` or less is refused: it returns `false` and the balance does not change.
- `bool TryWithdraw(decimal amount)` takes `amount` out and returns `true` when the balance covers it; withdrawing the whole balance is allowed. It returns `false` and changes nothing when the amount is `0` or less, or larger than the balance (no overdraft).
- Every account has its own balance: depositing into one account never changes another.

## `TrafficLight` and `Signals.Next`

`enum TrafficLight { Red, Green, Yellow }` is given. Write `static TrafficLight Signals.Next(TrafficLight light)`, which returns the light that comes after `light`: `Red` → `Green` → `Yellow` → `Red`.

Press **Run** to try the small program at the top of the file, and run the tests to grade your types.
