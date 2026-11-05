using System.Globalization;
using Dojo;

public static class TextToolsTests
{
    [Test("Slug.From trims, lower-cases and joins the words with single hyphens")]
    public static void SlugFrom()
    {
        Assert.Equal("joust-duffle-bag", Slug.From("  Joust Duffle Bag "));
        Assert.Equal("big-blue-box", Slug.From("Big   Blue  Box"));
        Assert.Equal("mug", Slug.From("Mug"));
        Assert.Equal("", Slug.From(""));
    }

    [Test("Quantity.TryRead reads whole numbers of 0 or more")]
    public static void TryReadAcceptsWholeNumbers()
    {
        Assert.True(Quantity.TryRead(" 12 ", out int twelve), "\" 12 \" is a valid quantity");
        Assert.Equal(12, twelve);
        Assert.True(Quantity.TryRead("0", out int zero), "\"0\" is a valid quantity");
        Assert.Equal(0, zero);
    }

    [Test("Quantity.TryRead rejects text, fractions, negatives and blanks with quantity 0")]
    public static void TryReadRejectsInvalidText()
    {
        string[] invalid = ["12abc", "1.5", "-3", "", "   "];
        foreach (string text in invalid)
        {
            bool accepted = Quantity.TryRead(text, out int quantity);
            Assert.False(accepted, $"\"{text}\" must be rejected");
            Assert.Equal(0, quantity, $"quantity must be 0 after rejecting \"{text}\"");
        }
    }

    [Test("Money.Format writes exactly 2 decimals")]
    public static void MoneyFormatTwoDecimals()
    {
        Assert.Equal("19.90", Money.Format(19.9m));
        Assert.Equal("5.00", Money.Format(5m));
        Assert.Equal("1234.50", Money.Format(1234.5m));
    }

    // beginner mistake: formatting with the current culture, which writes "19,90" where decimal commas are the rule
    [Test("Money.Format uses a dot whatever the current culture")]
    public static void MoneyFormatIgnoresTheCurrentCulture()
    {
        var original = CultureInfo.CurrentCulture;
        var commaCulture = (CultureInfo)CultureInfo.InvariantCulture.Clone();
        commaCulture.NumberFormat.NumberDecimalSeparator = ",";
        commaCulture.NumberFormat.NumberGroupSeparator = ".";
        CultureInfo.CurrentCulture = commaCulture;
        try
        {
            Assert.Equal("19.90", Money.Format(19.9m));
            Assert.Equal("1234.50", Money.Format(1234.5m));
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }

    [Test("Vowels.Count counts a, e, i, o and u in either case")]
    public static void VowelsCount()
    {
        Assert.Equal(2, Vowels.Count("Duffle"));
        Assert.Equal(5, Vowels.Count("AEIOU"));
        Assert.Equal(0, Vowels.Count("rhythm"));
        Assert.Equal(0, Vowels.Count(""));
    }
}
