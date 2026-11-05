using Dojo;

public static class BankAccountTests
{
    [Test("A new account keeps its owner and starts with a balance of 0")]
    public static void NewAccount()
    {
        var account = new BankAccount("Ana");

        Assert.Equal("Ana", account.Owner);
        Assert.Equal(0m, account.Balance);
    }

    [Test("Deposit adds a positive amount and refuses 0 or a negative amount")]
    public static void DepositAddsPositiveAmounts()
    {
        var account = new BankAccount("Ana");

        Assert.True(account.Deposit(40m), "depositing 40 should succeed");
        Assert.True(account.Deposit(2.50m), "depositing 2.50 should succeed");
        Assert.False(account.Deposit(0m), "depositing 0 should be refused");
        Assert.False(account.Deposit(-10m), "depositing -10 should be refused");
        Assert.Equal(42.50m, account.Balance);
    }

    [Test("TryWithdraw refuses an overdraft and a non-positive amount, and allows the whole balance")]
    public static void TryWithdrawNeverOverdraws()
    {
        var account = new BankAccount("Ana");
        account.Deposit(50m);

        Assert.False(account.TryWithdraw(50.01m), "50.01 out of 50 is an overdraft");
        Assert.False(account.TryWithdraw(0m), "withdrawing 0 should be refused");
        Assert.False(account.TryWithdraw(-5m), "withdrawing -5 should be refused");
        Assert.Equal(50m, account.Balance);
        Assert.True(account.TryWithdraw(20m), "20 out of 50 should succeed");
        Assert.True(account.TryWithdraw(30m), "the whole remaining 30 should succeed");
        Assert.Equal(0m, account.Balance);
    }

    // beginner mistake: a static balance field is shared by every account, so one deposit changes them all
    [Test("Two accounts keep separate balances")]
    public static void AccountsAreIndependent()
    {
        var ana = new BankAccount("Ana");
        var ben = new BankAccount("Ben");

        ana.Deposit(100m);
        ben.Deposit(5m);
        ana.TryWithdraw(10m);

        Assert.Equal(90m, ana.Balance);
        Assert.Equal(5m, ben.Balance);
        Assert.Equal("Ben", ben.Owner);
    }

    [Test("Balance cannot be set from outside the class")]
    public static void BalanceHasNoPublicSetter()
    {
        // Reads the declaration of the Balance property: its set accessor, if any, must not be public.
        var setter = typeof(BankAccount).GetProperty("Balance")?.SetMethod;

        Assert.NotNull(typeof(BankAccount).GetProperty("Balance"), "BankAccount needs a Balance property");
        Assert.True(setter is null || !setter.IsPublic, "Balance must not have a public set accessor");
    }

    [Test("Signals.Next goes Red, Green, Yellow and back to Red")]
    public static void TrafficLightCycles()
    {
        Assert.Equal(TrafficLight.Green, Signals.Next(TrafficLight.Red));
        Assert.Equal(TrafficLight.Yellow, Signals.Next(TrafficLight.Green));
        Assert.Equal(TrafficLight.Red, Signals.Next(TrafficLight.Yellow));
    }
}
