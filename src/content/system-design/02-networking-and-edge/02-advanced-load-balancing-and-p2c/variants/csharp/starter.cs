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
        // TODO: match on segment boundaries and let the longest matching prefix win
        var match = _routes.FirstOrDefault(candidate => path.StartsWith(candidate.Prefix, StringComparison.Ordinal));
        return match?.Pool;
    }
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
        // TODO: throw on an empty pool, sample two distinct backends and keep the less loaded one
        var chosen = _backends[(int)Math.Floor(_random() * _backends.Length)];
        _inFlight[chosen] = InFlight(chosen) + 1;
        return chosen;
    }

    public void Release(string name)
    {
        // TODO: lower the count of a known backend, never below zero
    }
}
