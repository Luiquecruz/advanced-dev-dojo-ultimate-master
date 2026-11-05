using Dojo;

public static class ErrorsAndTestingTests
{
    [Test("Parse returns ages from 0 to 150, spaces allowed, and throws ArgumentOutOfRangeException outside them")]
    public static void ParseReturnsValidAgesAndRejectsOutOfRange()
    {
        Assert.Equal(0, Ages.Parse("0"));
        Assert.Equal(42, Ages.Parse(" 42 "));
        Assert.Equal(150, Ages.Parse("150"));
        Assert.Throws<ArgumentOutOfRangeException>(() => Ages.Parse("-1"), "Parse(\"-1\") should throw ArgumentOutOfRangeException");
        Assert.Throws<ArgumentOutOfRangeException>(() => Ages.Parse("151"), "Parse(\"151\") should throw ArgumentOutOfRangeException");
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

    [Test("CountAdults counts every age of 18 or more, up to the last one")]
    public static void CountAdultsCountsEveryAge()
    {
        Assert.Equal(2, Ages.CountAdults([20, 17, 18]));
        Assert.Equal(0, Ages.CountAdults([]));
        Assert.Equal(1, Ages.CountAdults([3, 65]));
    }

    [Test("A new SignUpList trims its event name, starts empty and refuses a blank event name")]
    public static void NewSignUpListStartsEmpty()
    {
        var list = new SignUpList("  Summer Run ");

        Assert.Equal("Summer Run", list.EventName);
        Assert.Equal(0, list.Count);
        Assert.Equal(0, list.Adults());
        Assert.Throws<ArgumentException>(() => new SignUpList("   "), "a blank event name should throw ArgumentException");
    }

    [Test("Add stores each age under the trimmed, lowercase name, and Find and Adults read them")]
    public static void AddStoresAndFindReads()
    {
        var list = new SignUpList("Summer Run");

        list.Add(" Ana ", "34");
        list.Add("BRUNO", " 16 ");
        list.Add("carla", "18");

        Assert.Equal(3, list.Count);
        Assert.Equal((true, 34), list.Find("ana"));
        Assert.Equal((true, 16), list.Find(" Bruno"));
        Assert.Equal((false, 0), list.Find("Dan"));
        Assert.Equal(2, list.Adults());
    }

    [Test("Add refuses a blank name, a name already signed up and a bad age, and then changes nothing")]
    public static void AddRefusesBadSignUps()
    {
        var list = new SignUpList("Summer Run");
        list.Add("Ana", "34");

        Assert.Throws<ArgumentException>(() => list.Add("   ", "30"), "a blank name should throw ArgumentException");
        Assert.Throws<ArgumentException>(() => list.Add(" ANA", "40"), "\" ANA\" is the same person as \"Ana\" and should throw ArgumentException");
        Assert.Throws<ArgumentOutOfRangeException>(() => list.Add("Dan", "200"), "an age of 200 should throw ArgumentOutOfRangeException");
        Assert.Throws<ArgumentException>(() => list.Add("Eva", "ten"), "an age that is not a number should throw ArgumentException");

        Assert.Equal(1, list.Count, "a refused sign-up should not change Count");
        Assert.Equal((true, 34), list.Find("ana"), "a refused sign-up should not change Ana's age");
        Assert.Equal((false, 0), list.Find("Dan"), "a refused sign-up should not be stored");
    }
}
