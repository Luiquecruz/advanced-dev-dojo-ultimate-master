// Top-level statements: Run executes these lines and prints the results in the console panel.
// The tests ignore them and call the methods of Receipt directly.
Console.WriteLine(Receipt.Describe("Mug", 3));
Console.WriteLine(Receipt.LineTotal(4.50m, 3));
Console.WriteLine(Receipt.WithTax(100m, 0.21m));
Console.WriteLine(Receipt.AverageRating(7, 2));

// A class groups methods (lesson 00/06). Each method below takes the values in its parentheses
// and gives back one result with `return` (lesson 00/02). Replace each `return` value.
public static class Receipt
{
    public static decimal LineTotal(decimal price, int quantity)
    {
        // TODO: the price of one item times the quantity.
        return 0m;
    }

    public static decimal WithTax(decimal net, decimal rate)
    {
        // TODO: net plus net times rate, rounded to 2 decimal places with Math.Round.
        return net;
    }

    public static string Describe(string name, int quantity)
    {
        // TODO: "3 x Mug" for quantity 3 and name "Mug".
        return name;
    }

    public static int FullBoxes(int items, int perBox)
    {
        // TODO: how many boxes of perBox items can be filled completely.
        return 0;
    }

    public static int Leftover(int items, int perBox)
    {
        // TODO: how many items remain outside a full box.
        return 0;
    }

    public static double AverageRating(int totalStars, int votes)
    {
        // TODO: keep the fraction: 7 stars from 2 votes is 3.5.
        return totalStars / votes;
    }
}
