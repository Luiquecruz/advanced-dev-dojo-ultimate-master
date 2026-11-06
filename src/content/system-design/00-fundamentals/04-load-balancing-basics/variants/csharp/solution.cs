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
        for (var step = 1; step <= _pool.Count; step++)
        {
            var index = (_last + step) % _pool.Count;
            if (!_down.Contains(_pool[index]))
            {
                _last = index;
                return _pool[index];
            }
        }
        throw new InvalidOperationException("no healthy servers");
    }

    public void MarkDown(string name)
    {
        if (_pool.Contains(name))
        {
            _down.Add(name);
        }
    }

    public void MarkUp(string name) => _down.Remove(name);

    public IReadOnlyList<string> Healthy() => _pool.Where(server => !_down.Contains(server)).ToList();
}
