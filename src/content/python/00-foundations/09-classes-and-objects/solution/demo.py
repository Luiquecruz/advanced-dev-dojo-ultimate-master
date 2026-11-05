from main import BankAccount, InsufficientFunds, SavingsAccount, total_balance

checking = BankAccount("Ada", 5000)
savings = SavingsAccount("Ada", 10000, rate_percent=3)

checking.deposit(1500)
checking.withdraw(2000)
try:
    checking.withdraw(99999)
except InsufficientFunds as error:
    print("refused:", error)

savings.add_interest()

print(checking, checking.history)
print(savings, savings.history)
print("total:", total_balance([checking, savings]))
