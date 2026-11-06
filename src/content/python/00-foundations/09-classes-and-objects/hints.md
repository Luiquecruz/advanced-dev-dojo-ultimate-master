`InsufficientFunds` needs no body beyond `pass`; what matters is the parent in parentheses: `class InsufficientFunds(ValueError):`. In each method, check the amount first and raise before changing `self.balance`, so a rejected call leaves the account exactly as it was. Create the history in `__init__` with `self.history = []`. A list written in the class body is created once and shared by every account.
---
In `SavingsAccount.__init__`, call `super().__init__(owner, balance)` first, then set `self.rate_percent`. `add_interest` can reuse `self.deposit(interest)`, which updates the balance and the history for you.
---
`f"{type(self).__name__}({self.owner!r}, {self.balance!r})"` gives `BankAccount('Ada', 100)`. `recent` can reverse the history with the slice `[::-1]`, which is already a new list, and then keep `[:n]` of it.
---
In `statement`, first add up a dict of totals per owner with `totals.get(owner, 0) + account.balance`. Then loop over `sorted(totals)` and store `f"{totals[owner] / 100:.2f}"` under each owner in a second dict: a dict keeps the order its keys were added in.
