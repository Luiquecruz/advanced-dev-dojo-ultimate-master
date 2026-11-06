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
        if (!int.TryParse(text, out int age))
        {
            throw new ArgumentException($"'{text}' is not a whole number.", nameof(text));
        }

        if (age < 0 || age > 150)
        {
            throw new ArgumentOutOfRangeException(nameof(text), age, "An age is between 0 and 150.");
        }

        return age;
    }

    public static int CountAdults(int[] ages)
    {
        int count = 0;

        for (int i = 0; i < ages.Length; i++)
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
        if (string.IsNullOrWhiteSpace(eventName))
        {
            throw new ArgumentException("An event needs a name.", nameof(eventName));
        }

        EventName = eventName.Trim();
    }

    public string EventName { get; }

    public int Count { get; private set; }

    public void Add(string name, string ageText)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("A sign-up needs a name.", nameof(name));
        }

        string key = KeyOf(name);

        if (_ages.ContainsKey(key))
        {
            throw new ArgumentException($"'{name.Trim()}' is already signed up.", nameof(name));
        }

        _ages[key] = Ages.Parse(ageText);
        Count++;
    }

    public (bool Found, int Age) Find(string name)
    {
        if (_ages.TryGetValue(KeyOf(name), out int age))
        {
            return (true, age);
        }

        return (false, 0);
    }

    public int Adults()
    {
        int adults = 0;

        foreach (var (name, age) in _ages)
        {
            if (age >= 18)
            {
                adults++;
            }
        }

        return adults;
    }

    private static string KeyOf(string name) => name.Trim().ToLowerInvariant();
}
