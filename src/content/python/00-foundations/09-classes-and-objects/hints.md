`InsufficientFunds` needs no body beyond `pass`; what matters is the parent in parentheses: `class InsufficientFunds(ValueError):`. In each method, check the amount first and raise before changing `self.balance`, so a rejected call leaves the account exactly as it was.
---
Create the history in `__init__` with `self.history = []`. A list written in the class body is created once and shared by every account.
---
In `SavingsAccount.__init__`, call `super().__init__(owner, balance)` first, then set `self.rate_percent`. `add_interest` can reuse `self.deposit(interest)`, which updates the balance and the history for you.
---
`f"{type(self).__name__}({self.owner!r}, {self.balance!r})"` gives `BankAccount('Ada', 100)`. For `total_balance`, `sum(account.balance for account in accounts)` adds every balance and is 0 for an empty list.
