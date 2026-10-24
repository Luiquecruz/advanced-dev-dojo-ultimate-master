Rename the field to `#balance` and update every `this.balance` to `this.#balance`. Add `readonly` before `owner`.
---
Validate at the top of each method: `if (amount <= 0) throw new RangeError('...')`. For withdrawals, also compare `amount > this.#balance`.
---
In `transferTo`, reuse `this.withdraw(amount)` (it already validates) and then write `target.#balance += amount;`. Code inside the class may read the private field of any `BankAccount`.
