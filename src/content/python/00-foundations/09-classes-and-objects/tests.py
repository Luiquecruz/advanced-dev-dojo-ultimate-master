@test("deposit and withdraw change the balance, return it and record the signed amounts")
def _():
    account = mod.BankAccount("Ada", 100)
    after_deposit = account.deposit(50)
    assert after_deposit == 150
    after_withdrawal = account.withdraw(30)
    assert after_withdrawal == 120
    assert account.balance == 120
    assert account.owner == "Ada"
    assert account.history == [50, -30]


@test("deposit and withdraw reject zero and negative amounts with ValueError and change nothing")
async def _():
    account = mod.BankAccount("Ada", 100)
    for amount in [0, -5]:
        deposit_error = await capture_error(lambda: account.deposit(amount))
        assert isinstance(deposit_error, ValueError)
        withdraw_error = await capture_error(lambda: account.withdraw(amount))
        assert isinstance(withdraw_error, ValueError)
    assert account.balance == 100
    assert account.history == []


@test("withdrawing more than the balance raises InsufficientFunds, a kind of ValueError, and changes nothing")
async def _():
    assert issubclass(mod.InsufficientFunds, ValueError)
    account = mod.BankAccount("Ada", 100)
    error = await capture_error(lambda: account.withdraw(101))
    assert isinstance(error, mod.InsufficientFunds)
    assert account.balance == 100
    assert account.history == []
    emptied = account.withdraw(100)
    assert emptied == 0


# beginner mistake: writing history = [] in the class body, so every account shares one list
@test("each account keeps its own history")
def _():
    first = mod.BankAccount("Ada")
    second = mod.BankAccount("Grace")
    first.deposit(10)
    assert first.history == [10]
    assert second.history == []
    assert first.history is not second.history


@test("SavingsAccount sets up the parent's attributes through super and deposits its interest")
def _():
    savings = mod.SavingsAccount("Ada", 1000, rate_percent=3)
    assert isinstance(savings, mod.BankAccount)
    assert savings.owner == "Ada"
    assert savings.rate_percent == 3
    interest = savings.add_interest()
    assert interest == 30
    assert savings.balance == 1030
    assert savings.history == [30]
    small = mod.SavingsAccount("Grace", 10)
    nothing = small.add_interest()
    assert nothing == 0
    assert small.history == []


@test("repr shows how each account is created and total_balance adds every balance")
def _():
    account = mod.BankAccount("Ada", 100)
    savings = mod.SavingsAccount("Grace", 1000, rate_percent=3)
    plain = repr(account)
    assert plain == "BankAccount('Ada', 100)"
    saving = repr(savings)
    assert saving == "SavingsAccount('Grace', 1000, rate_percent=3)"
    total = mod.total_balance([account, savings])
    assert total == 1100
    nothing = mod.total_balance([])
    assert nothing == 0
