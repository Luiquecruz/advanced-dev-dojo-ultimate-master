var account = new BankAccount("Ana");
account.Deposit(100m);
account.TryWithdraw(30m);
Console.WriteLine($"{account.Owner}: {account.Balance}");
Console.WriteLine(Signals.Next(TrafficLight.Red));

public class BankAccount
{
    public BankAccount(string owner)
    {
        // TODO: store the owner passed in.
        Owner = "";
    }

    public string Owner { get; }

    // TODO: any code may read the balance, but only this class may change it.
    public decimal Balance { get; set; }

    public bool Deposit(decimal amount)
    {
        // TODO: refuse an amount of 0 or less; otherwise add it to the balance.
        return false;
    }

    public bool TryWithdraw(decimal amount)
    {
        // TODO: refuse an amount of 0 or less, or more than the balance; otherwise take it out.
        return false;
    }
}

public enum TrafficLight { Red, Green, Yellow }

public static class Signals
{
    public static TrafficLight Next(TrafficLight light)
    {
        // TODO: Red -> Green -> Yellow -> Red.
        return light;
    }
}
