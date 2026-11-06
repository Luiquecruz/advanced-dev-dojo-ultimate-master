using Dojo;

public static class LoadBalancingTests
{
    private static Func<double> Sequence(params double[] values)
    {
        var index = 0;
        return () =>
        {
            if (index == values.Length)
            {
                Assert.Fail("random() was called more often than this test scripted: Pick() calls it exactly twice when there are two or more backends");
            }
            return values[index++];
        };
    }

    [Test("route sends a path to the pool of its prefix, matching whole path segments")]
    public static void RoutesByWholeSegments()
    {
        var router = new Router([new Route("/static", "cdn"), new Route("/api", "api"), new Route("/", "web")]);
        Assert.Equal("api", router.Route("/api"));
        Assert.Equal("api", router.Route("/api/users/7"));
        Assert.Equal("cdn", router.Route("/static/app.js"));
        Assert.Equal("web", router.Route("/apiary"));
        Assert.Null(new Router([new Route("/api", "api")]).Route("/admin"));
    }

    // beginner mistake: taking the first matching prefix instead of the longest one
    [Test("route lets the longest matching prefix win, whatever the order of the routes")]
    public static void LongestPrefixWins()
    {
        var router = new Router([new Route("/", "web"), new Route("/api", "api"), new Route("/api/v2", "api-v2")]);
        Assert.Equal("api-v2", router.Route("/api/v2/orders"));
        Assert.Equal("api", router.Route("/api/v1/orders"));
        Assert.Equal("web", router.Route("/about"));
        var reversed = new Router([new Route("/api/v2", "api-v2"), new Route("/api", "api")]);
        Assert.Equal("api-v2", reversed.Route("/api/v2/users"));
        Assert.Equal("api", reversed.Route("/api/users"));
    }

    [Test("pick sends each request to the less loaded of two sampled backends")]
    public static void PicksTheLessLoadedOfTwo()
    {
        var balancer = new P2CBalancer(["a", "b", "c", "d"], Sequence(0, 0, 0, 0, 0.5, 0.9, 0, 0.99, 0.25, 0));
        Assert.Equal("a", balancer.Pick());
        Assert.Equal("b", balancer.Pick());
        Assert.Equal("c", balancer.Pick());
        Assert.Equal("d", balancer.Pick());
        string[] names = ["a", "b", "c", "d"];
        Assert.SequenceEqual([1, 1, 1, 1], names.Select(balancer.InFlight));
        balancer.Release("a");
        Assert.Equal("a", balancer.Pick());
        Assert.Equal(1, balancer.InFlight("a"));
    }

    [Test("pick samples two distinct backends, breaks ties with the first sample and release never goes below zero")]
    public static void SamplesDistinctBackendsAndReleasesSafely()
    {
        var pair = new P2CBalancer(["x", "y"], Sequence(0.1, 0.1, 0.1, 0.1));
        Assert.Equal("x", pair.Pick());
        Assert.Equal("y", pair.Pick());
        pair.Release("y");
        pair.Release("y");
        pair.Release("ghost");
        Assert.Equal(0, pair.InFlight("y"));
        Assert.Equal(0, pair.InFlight("ghost"));
        Assert.Equal("solo", new P2CBalancer(["solo"], () => 0.5).Pick());
        var error = Assert.Throws<InvalidOperationException>(() => new P2CBalancer([], () => 0.5).Pick());
        Assert.Equal("no backends", error.Message);
    }
}
