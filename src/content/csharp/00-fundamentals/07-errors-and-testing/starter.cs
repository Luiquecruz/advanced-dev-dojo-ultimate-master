try
{
    Console.WriteLine(Ages.CountAdults([20, 17, 18]));
}
catch (Exception ex)
{
    Console.WriteLine(ex.ToString());
}

public static class Ages
{
    public static int Parse(string text)
    {
        // TODO: throw ArgumentException when text is not a whole number (int.TryParse helps).
        // TODO: throw ArgumentOutOfRangeException when the number is below 0 or above 150.
        return 0;
    }

    public static int CountAdults(int[] ages)
    {
        int count = 0;

        for (int i = 0; i <= ages.Length; i++)
        {
            if (ages[i] >= 18)
            {
                count++;
            }
        }

        return count;
    }
}

public class SignUpList
{
    private readonly Dictionary<string, int> _ages = new();

    public SignUpList(string eventName)
    {
        // TODO: throw ArgumentException for a blank event name; store the trimmed name in EventName.
    }

    public string EventName { get; } = "";

    public int Count { get; private set; }

    public void Add(string name, string ageText)
    {
        // TODO: refuse a blank or already signed-up name with ArgumentException.
        // TODO: store the age from Ages.Parse under the cleaned name (trimmed, lowercase), then count the sign-up.
    }

    public (bool Found, int Age) Find(string name)
    {
        // TODO: look the cleaned name up; return (true, age) when it is there, (false, 0) when it is not.
        return (false, 0);
    }

    public int Adults()
    {
        // TODO: count the stored ages that are 18 or more.
        return 0;
    }
}
