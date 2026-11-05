var account = new BankAccount("Ana");
account.Deposit(100m);
account.TryWithdraw(30m);
Console.WriteLine($"{account.Owner}: {account.Balance}");
Console.WriteLine(Signals.Next(TrafficLight.Red));

public class BankAccount
{
    public BankAccount(string owner)
    {
        Owner = owner;
    }

    public string Owner { get; }

    public decimal Balance { get; private set; }

    public bool Deposit(decimal amount)
    {
        if (amount <= 0m)
        {
            return false;
        }

        Balance += amount;
        return true;
    }

    public bool TryWithdraw(decimal amount)
    {
        if (amount <= 0m || amount > Balance)
        {
            return false;
        }

        Balance -= amount;
        return true;
    }
}

public enum TrafficLight { Red, Green, Yellow }

public static class Signals
{
    public static TrafficLight Next(TrafficLight light)
    {
        switch (light)
        {
            case TrafficLight.Red:
                return TrafficLight.Green;
            case TrafficLight.Green:
                return TrafficLight.Yellow;
            default:
                return TrafficLight.Red;
        }
    }
}
