1. Start with the exception: decide which built-in it extends, so that callers who handle `ValueError` also handle it.
2. In `BankAccount.__init__`, set every attribute the methods rely on, and make sure each account gets its own `history` list.
3. Write `deposit` and `withdraw` as guard checks first (non-positive amount, then not enough money), and change the balance and the history only after every check has passed.
4. Write `__repr__` so its text looks like the call that creates the account.
5. In `SavingsAccount`, let the parent's `__init__` do its part through `super()`, add `rate_percent`, and build `add_interest` on top of `deposit`; override `__repr__` to show the rate.
6. Write `recent` with slices, then `statement` in two steps: add up a total per owner, then build the result dict in alphabetical order with the totals formatted as euros.
7. Run the tests, then the demo, and check that the two accounts in the demo keep separate histories.
