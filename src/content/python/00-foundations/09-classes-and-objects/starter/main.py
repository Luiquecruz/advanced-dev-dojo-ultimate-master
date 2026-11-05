class InsufficientFunds(Exception):
    # TODO: make this exception a kind of ValueError.
    pass


class BankAccount:
    history = []  # TODO: give each account its own history list in __init__ instead.

    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        # TODO: raise ValueError when amount is zero or negative, before changing anything.
        self.balance += amount
        self.history.append(amount)
        return self.balance

    def withdraw(self, amount):
        # TODO: raise ValueError for a non-positive amount and InsufficientFunds when amount is larger than the balance.
        self.balance -= amount
        self.history.append(-amount)
        return self.balance

    def __repr__(self):
        # TODO: return a text such as BankAccount('Ada', 100).
        return "BankAccount"


class SavingsAccount(BankAccount):
    def __init__(self, owner, balance=0, rate_percent=2):
        # TODO: let the parent's __init__ set owner, balance and history, then store rate_percent.
        self.rate_percent = rate_percent

    def add_interest(self):
        # TODO: deposit balance * rate_percent // 100 when it is larger than zero, and return it.
        return 0

    # TODO: override __repr__ to return a text such as SavingsAccount('Ada', 1000, rate_percent=3).


def total_balance(accounts):
    # TODO: add up the balance of every account.
    return 0
