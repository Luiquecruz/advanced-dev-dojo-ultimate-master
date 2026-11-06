// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
var router = new Router([new Route("/", "web"), new Route("/api", "api"), new Route("/api/v2", "api-v2")]);
Console.WriteLine($"{router.Route("/api/v2/orders")} {router.Route("/apiary")}");

var balancer = new P2CBalancer(["a", "b", "c"], Random.Shared.NextDouble);
Console.WriteLine($"{balancer.Pick()} {balancer.Pick()} {balancer.Pick()}");

public record Route(string Prefix, string Pool);

public class Router
{
    private readonly Route[] _routes;

    public Router(IEnumerable<Route> routes)
    {
        _routes = [.. routes];
    }

    public string? Route(string path)
    {
        Route? best = null;
        foreach (var candidate in _routes)
        {
            if (Matches(candidate.Prefix, path) && (best is null || candidate.Prefix.Length > best.Prefix.Length))
            {
                best = candidate;
            }
        }
        return best?.Pool;
    }

    private static bool Matches(string prefix, string path) =>
        prefix == "/" || path == prefix || path.StartsWith(prefix + "/", StringComparison.Ordinal);
}

public class P2CBalancer
{
    private readonly string[] _backends;
    private readonly Func<double> _random;
    private readonly Dictionary<string, int> _inFlight = [];

    public P2CBalancer(IEnumerable<string> backends, Func<double> random)
    {
        _backends = [.. backends];
        _random = random;
    }

    public int InFlight(string name) => _inFlight.GetValueOrDefault(name);

    public string Pick()
    {
        var chosen = Choose();
        _inFlight[chosen] = InFlight(chosen) + 1;
        return chosen;
    }

    public void Release(string name)
    {
        if (_inFlight.TryGetValue(name, out var count) && count > 0)
        {
            _inFlight[name] = count - 1;
        }
    }

    private string Choose()
    {
        var n = _backends.Length;
        if (n == 0)
        {
            throw new InvalidOperationException("no backends");
        }
        if (n == 1)
        {
            return _backends[0];
        }
        var first = (int)Math.Floor(_random() * n);
        var second = (int)Math.Floor(_random() * (n - 1));
        if (second >= first)
        {
            second += 1;
        }
        return InFlight(_backends[second]) < InFlight(_backends[first]) ? _backends[second] : _backends[first];
    }
}
