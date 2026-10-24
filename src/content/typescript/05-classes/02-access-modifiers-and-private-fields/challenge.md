The starter `BankAccount` uses TypeScript's `private` modifier, so the balance still leaks at runtime
(`Object.keys(account)` includes it). Refactor it and add a transfer method:

1. Store the balance in a JavaScript private field **`#balance`**, starting at `0`.
2. Make `owner` **`readonly`** (still public).
3. `deposit(amount: number): void` — throws a `RangeError` when `amount <= 0`.
4. `withdraw(amount: number): void` — throws a `RangeError` when `amount <= 0`, and an `Error` with the
   message `"Insufficient funds"` when the balance is too low.
5. `getBalance(): number` — returns the balance.
6. `transferTo(target: BankAccount, amount: number): void` — withdraws from this account and adds the
   amount to `target` by writing `target.#balance` directly.

After the refactor, `Object.keys(new BankAccount('Ada'))` must be `['owner']`.
