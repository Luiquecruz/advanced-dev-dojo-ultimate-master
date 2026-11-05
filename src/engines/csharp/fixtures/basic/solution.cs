public static class Scores
{
    public static int Total(IEnumerable<int> scores) => scores.Where(score => score > 0).Sum();

    public static string Grade(int score) => score switch
    {
        >= 90 => "A",
        >= 75 => "B",
        >= 60 => "C",
        _ => "F",
    };
}
