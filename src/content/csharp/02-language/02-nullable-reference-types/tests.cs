using Dojo;

public static class CustomerDirectoryTests
{
    private static CustomerDirectory Directory()
    {
        var directory = new CustomerDirectory();
        directory.Add(new Customer("c-1", "Ada Lovelace", "ada@example.com"));
        directory.Add(new Customer("c-2", "Alan Turing") { Nickname = "Prof" });
        return directory;
    }

    [Test("Find returns the stored customer for a known id")]
    public static void FindKnown()
    {
        var customer = Assert.NotNull(Directory().Find("c-1"));
        Assert.Equal("Ada Lovelace", customer.Name);
    }

    // beginner mistake: reading the dictionary with its indexer, which throws KeyNotFoundException for a missing key
    [Test("Find returns null for an unknown id")]
    public static void FindUnknown() => Assert.Null(Directory().Find("c-404"));

    [Test("DisplayName prefers the nickname, then the name, then \"guest\"")]
    public static void DisplayNameFallsBack()
    {
        var directory = Directory();
        Assert.Equal("Prof", directory.DisplayName("c-2"));
        Assert.Equal("Ada Lovelace", directory.DisplayName("c-1"));
        Assert.Equal("guest", directory.DisplayName("c-404"));
    }

    [Test("EmailLength counts the email, or is 0 when the customer or the email is missing")]
    public static void EmailLengthHandlesBothNulls()
    {
        var directory = Directory();
        Assert.Equal(15, directory.EmailLength("c-1"));
        Assert.Equal(0, directory.EmailLength("c-2"));
        Assert.Equal(0, directory.EmailLength("c-404"));
    }

    [Test("The constructor rejects a null id or name with ArgumentNullException")]
    public static void ConstructorGuards()
    {
        var missingName = Assert.Throws<ArgumentNullException>(() => new Customer("c-3", null!));
        Assert.Equal("name", missingName.ParamName);
        var missingId = Assert.Throws<ArgumentNullException>(() => new Customer(null!, "Grace Hopper"));
        Assert.Equal("id", missingId.ParamName);
    }
}
