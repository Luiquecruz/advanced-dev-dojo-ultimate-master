using Dojo;

public static class RoundRobinTests
{
    private static List<string> Pick(RoundRobin balancer, int count)
    {
        var picked = new List<string>();
        for (var call = 0; call < count; call++)
        {
            picked.Add(balancer.Next());
        }
        return picked;
    }

    [Test("next() walks the servers in order and wraps around")]
    public static void WalksInOrderAndWrapsAround()
    {
        var balancer = new RoundRobin(["a", "b", "c"]);
        Assert.SequenceEqual(["a", "b", "c", "a", "b", "c", "a"], Pick(balancer, 7));
        Assert.SequenceEqual(["a", "b", "c"], balancer.Healthy());
    }

    // beginner mistake: rotating over a shrinking healthy list by counter, or skipping only one server, so a down server is hit or a healthy one is skipped
    [Test("after servers go down mid-rotation, next() continues with the next healthy server and never picks a down one")]
    public static void ContinuesAfterServersGoDown()
    {
        var balancer = new RoundRobin(["a", "b", "c", "d", "e"]);
        Assert.SequenceEqual(["a", "b"], Pick(balancer, 2));
        balancer.MarkDown("a");
        balancer.MarkDown("c");
        balancer.MarkDown("d");
        Assert.SequenceEqual(["e", "b", "e", "b"], Pick(balancer, 4));
        Assert.SequenceEqual(["b", "e"], balancer.Healthy());
        balancer.MarkDown("b");
        balancer.MarkUp("a");
        Assert.SequenceEqual(["e", "a", "e"], Pick(balancer, 3));
    }

    [Test("marking a server up puts it back at its place in the rotation")]
    public static void MarkUpRestoresItsPlace()
    {
        var balancer = new RoundRobin(["a", "b", "c"]);
        balancer.MarkDown("b");
        Assert.SequenceEqual(["a", "c", "a"], Pick(balancer, 3));
        balancer.MarkUp("b");
        Assert.SequenceEqual(["b", "c", "a", "b"], Pick(balancer, 4));
        Assert.SequenceEqual(["a", "b", "c"], balancer.Healthy());
    }

    [Test("next() fails with \"no healthy servers\" when every server is down, and recovers once a server is marked up")]
    public static void FailsWhenEveryServerIsDown()
    {
        var balancer = new RoundRobin(["a", "b"]);
        balancer.MarkDown("a");
        balancer.MarkDown("b");
        var error = Assert.Throws<InvalidOperationException>(() => balancer.Next());
        Assert.Equal("no healthy servers", error.Message);
        Assert.SequenceEqual([], balancer.Healthy());
        balancer.MarkUp("b");
        Assert.SequenceEqual(["b", "b"], Pick(balancer, 2));
        var emptyPoolError = Assert.Throws<InvalidOperationException>(() => new RoundRobin([]).Next());
        Assert.Equal("no healthy servers", emptyPoolError.Message);
    }
}
