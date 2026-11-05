Start with the constructor and the property declaration. `Owner = owner;` stores the parameter. Change `{ get; set; }` on `Balance` to `{ get; private set; }`: code outside the class can still read it, but only the class's own methods can assign it.

---

`Deposit` and `TryWithdraw` begin with a guard: an `if` that returns `false` before anything changes. For `Deposit` the refused case is `amount <= 0m`; for `TryWithdraw` it is `amount <= 0m || amount > Balance`. Use `>` and not `>=`, so taking out exactly the whole balance still works. After the guard, change `Balance` and return `true`.

---

Keep `Balance` an instance property, with no `static` keyword, so each `new BankAccount(...)` has its own. For `Signals.Next`, a `switch` statement on `light` with one `case` per color returns the next one; let `default` handle `Yellow`, which goes back to `Red`.
