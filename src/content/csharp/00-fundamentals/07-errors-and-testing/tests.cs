using Dojo;

public static class ErrorsAndTestingTests
{
    [Test("Parse returns the age for whole numbers from 0 to 150, spaces allowed")]
    public static void ParseReturnsValidAges()
    {
        Assert.Equal(0, Ages.Parse("0"));
        Assert.Equal(42, Ages.Parse(" 42 "));
        Assert.Equal(150, Ages.Parse("150"));
    }

    // beginner mistake: int.Parse lets a FormatException escape instead of throwing ArgumentException
    [Test("Parse throws exactly ArgumentException for text that is not a whole number")]
    public static void ParseRejectsText()
    {
        foreach (string text in new[] { "abc", "12abc", "", "   " })
        {
            var ex = Assert.Throws<ArgumentException>(() => Ages.Parse(text), $"Parse(\"{text}\") should throw ArgumentException");
            Assert.Equal(typeof(ArgumentException), ex.GetType(), $"Parse(\"{text}\") should throw ArgumentException itself, not a more specific type");
        }
    }

    [Test("Parse throws ArgumentOutOfRangeException for ages below 0 or above 150")]
    public static void ParseRejectsOutOfRange()
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => Ages.Parse("-1"), "Parse(\"-1\") should throw ArgumentOutOfRangeException");
        Assert.Throws<ArgumentOutOfRangeException>(() => Ages.Parse("151"), "Parse(\"151\") should throw ArgumentOutOfRangeException");
    }

    [Test("Divide returns the integer quotient for a non-zero divisor")]
    public static void DivideReturnsQuotient()
    {
        Assert.Equal((true, 3), Safe.Divide(7, 2));
        Assert.Equal((true, -4), Safe.Divide(-8, 2));
    }

    [Test("Divide returns (false, 0) for a divisor of 0 instead of throwing")]
    public static void DivideByZeroIsRefused()
    {
        var (ok, result) = Safe.Divide(5, 0);

        Assert.False(ok, "dividing by 0 should not be ok");
        Assert.Equal(0, result);
    }

    [Test("CountAdults counts every age of 18 or more, up to the last one")]
    public static void CountAdultsCountsEveryAge()
    {
        Assert.Equal(2, Ages.CountAdults([20, 17, 18]));
        Assert.Equal(0, Ages.CountAdults([]));
        Assert.Equal(1, Ages.CountAdults([3, 65]));
    }
}
