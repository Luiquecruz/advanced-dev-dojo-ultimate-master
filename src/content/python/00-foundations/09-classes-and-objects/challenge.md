Model bank accounts in `main.py`. Amounts are whole numbers of cents, so `1000` is ten euros. This is the last lesson of module zero: if you can solve this challenge without the hints, continue with module 01.

## `InsufficientFunds`

An exception class that is a kind of `ValueError`.

## `BankAccount(owner, balance=0)`

Each account has the attributes `owner`, `balance` and `history`. `history` is a list that starts empty and gets one entry per deposit or withdrawal: the amount for a deposit and the negative amount for a withdrawal.

- `deposit(amount)` adds `amount` to the balance, records it and returns the new balance.
- `withdraw(amount)` subtracts `amount`, records `-amount` and returns the new balance. It raises `InsufficientFunds` when `amount` is larger than the balance, and changes nothing in that case.
- Both methods raise `ValueError` when `amount` is zero or negative, and change nothing.
- `repr(BankAccount("Ada", 100))` is `BankAccount('Ada', 100)`.

Every account keeps its own history: a deposit into one account never shows up in another.

## `SavingsAccount(owner, balance=0, rate_percent=2)`

A subclass of `BankAccount` that sets up `owner`, `balance` and `history` through the parent's `__init__` and also stores `rate_percent`.

- `add_interest()` computes `balance * rate_percent // 100`, deposits it when it is larger than zero and returns it (0 when there is nothing to add).
- `repr(SavingsAccount("Ada", 1000, rate_percent=3))` is `SavingsAccount('Ada', 1000, rate_percent=3)`.

## `total_balance(accounts)`

Return the sum of the balances of every account in the list (0 for an empty list).

Press **Run** to watch two accounts in `demo.py`.
