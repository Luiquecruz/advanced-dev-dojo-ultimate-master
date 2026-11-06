// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
var balancer = new RoundRobin(["a", "b", "c"]);
Console.WriteLine($"{balancer.Next()} {balancer.Next()} {balancer.Next()} {balancer.Next()}");
balancer.MarkDown("c");
Console.WriteLine($"{balancer.Next()} {balancer.Next()} {balancer.Next()} [{string.Join(", ", balancer.Healthy())}]");

public class RoundRobin(IEnumerable<string> servers)
{
    private readonly List<string> _pool = [.. servers];
    private readonly HashSet<string> _down = [];
    private int _last = -1;

    public string Next()
    {
        // TODO: skip servers marked down, and throw new InvalidOperationException("no healthy servers") when none is left
        _last = (_last + 1) % _pool.Count;
        return _pool[_last];
    }

    public void MarkDown(string name)
    {
        // TODO: take the server out of the rotation
    }

    public void MarkUp(string name)
    {
        // TODO: put the server back into the rotation
    }

    public IReadOnlyList<string> Healthy()
    {
        // TODO: only the servers that are not marked down
        return _pool.ToList();
    }
}
