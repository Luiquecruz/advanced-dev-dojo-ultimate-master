class InsufficientFunds(ValueError):
    pass


class BankAccount:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance
        self.history = []

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError(f"deposit must be positive, got {amount}")
        self.balance += amount
        self.history.append(amount)
        return self.balance

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError(f"withdrawal must be positive, got {amount}")
        if amount > self.balance:
            raise InsufficientFunds(f"cannot withdraw {amount} from a balance of {self.balance}")
        self.balance -= amount
        self.history.append(-amount)
        return self.balance

    def recent(self, n):
        return self.history[::-1][:n]

    def __repr__(self):
        return f"{type(self).__name__}({self.owner!r}, {self.balance!r})"


class SavingsAccount(BankAccount):
    def __init__(self, owner, balance=0, rate_percent=2):
        super().__init__(owner, balance)
        self.rate_percent = rate_percent

    def add_interest(self):
        interest = self.balance * self.rate_percent // 100
        if interest > 0:
            self.deposit(interest)
        return interest

    def __repr__(self):
        return f"SavingsAccount({self.owner!r}, {self.balance!r}, rate_percent={self.rate_percent!r})"


def statement(accounts):
    totals = {}
    for account in accounts:
        totals[account.owner] = totals.get(account.owner, 0) + account.balance
    result = {}
    for owner in sorted(totals):
        result[owner] = f"{totals[owner] / 100:.2f}"
    return result
