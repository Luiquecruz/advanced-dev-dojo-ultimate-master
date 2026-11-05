using Dojo;

public static class ScoresTests
{
    [Test("Total adds the positive scores")]
    public static void TotalAddsPositiveScores() => Assert.Equal(12, Scores.Total([5, -3, 7]));

    [Test("Total of no scores is 0")]
    public static void TotalOfNothing() => Assert.Equal(0, Scores.Total([]));

    [Test("Grade maps score bands to letters")]
    public static void GradeBands()
    {
        Assert.SequenceEqual(["A", "B", "C", "F"], new[] { 95, 80, 60, 10 }.Select(Scores.Grade));
    }

    [Test("Grade works after an await")]
    public static async Task GradeAfterAwait()
    {
        await Task.Delay(1);
        Assert.Equal("A", Scores.Grade(90));
    }
}
