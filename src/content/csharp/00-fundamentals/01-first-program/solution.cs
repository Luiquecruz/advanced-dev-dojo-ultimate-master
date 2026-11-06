// Top-level statements: Run executes these lines and prints the results in the console panel.
// The tests ignore them and call the methods of Receipt directly.
Console.WriteLine(Receipt.Describe("Mug", 3));
Console.WriteLine(Receipt.LineTotal(4.50m, 3));
Console.WriteLine(Receipt.WithTax(100m, 0.21m));
Console.WriteLine(Receipt.AverageRating(7, 2));

// A class groups methods (lesson 00/06). Each method below takes the values in its parentheses
// and gives back one result with `return` (lesson 00/02).
public static class Receipt
{
    public static decimal LineTotal(decimal price, int quantity)
    {
        return price * quantity;
    }

    public static decimal WithTax(decimal net, decimal rate)
    {
        return Math.Round(net * (1 + rate), 2);
    }

    public static string Describe(string name, int quantity)
    {
        return $"{quantity} x {name}";
    }

    public static int FullBoxes(int items, int perBox)
    {
        return items / perBox;
    }

    public static int Leftover(int items, int perBox)
    {
        return items % perBox;
    }

    public static double AverageRating(int totalStars, int votes)
    {
        return (double)totalStars / votes;
    }
}
