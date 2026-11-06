using Dojo;

public sealed class FakeClock
{
    public long Now { get; set; }
}

public static class SessionTests
{
    private static (FakeClock Clock, SessionStore Store, Server ServerA, Server ServerB) Setup(long ttlMs = 1000)
    {
        var clock = new FakeClock();
        var store = new SessionStore(ttlMs: ttlMs, now: () => clock.Now);
        return (clock, store, new Server("a", store), new Server("b", store));
    }

    [Test("login returns a new session id, and asking who is logged in answers 200 with the user, or 401 for an unknown id")]
    public static void LoginAndWhoAmI()
    {
        var (_, _, serverA, _) = Setup();
        var ada = serverA.Login("ada");
        var alan = serverA.Login("alan");
        Assert.False(string.IsNullOrEmpty(ada), "login returns a session id");
        Assert.NotEqual(ada, alan);
        Assert.Equal(new HttpResponse(200, new UserBody("ada", "a")), serverA.WhoAmI(ada));
        Assert.Equal(new HttpResponse(200, new UserBody("alan", "a")), serverA.WhoAmI(alan));
        Assert.Equal(new HttpResponse(401, new ErrorBody("not logged in")), serverA.WhoAmI("no-such-session"));
    }

    // beginner mistake: keeping the session in one server's memory instead of the shared store
    [Test("a session created on one server is recognized by another server that shares the store")]
    public static void SessionWorksOnEveryServer()
    {
        var (_, _, serverA, serverB) = Setup();
        var sessionId = serverA.Login("ada");
        Assert.Equal(new HttpResponse(200, new UserBody("ada", "b")), serverB.WhoAmI(sessionId));
        Assert.NotEqual(sessionId, serverB.Login("grace"));
    }

    [Test("a session expires exactly one TTL after login")]
    public static void SessionExpiresAfterOneTtl()
    {
        var (clock, store, serverA, serverB) = Setup(ttlMs: 1000);
        clock.Now = 5000;
        var sessionId = serverA.Login("ada");
        clock.Now = 5999;
        Assert.Equal(200, serverB.WhoAmI(sessionId).Status);
        clock.Now = 6000;
        Assert.Equal(new HttpResponse(401, new ErrorBody("not logged in")), serverB.WhoAmI(sessionId));
        Assert.Null(store.Get(sessionId));
    }

    [Test("logout on one server answers 204 and ends the session on every server")]
    public static void LogoutEndsSessionEverywhere()
    {
        var (_, _, serverA, serverB) = Setup();
        var ada = serverA.Login("ada");
        var alan = serverA.Login("alan");
        Assert.Equal(new HttpResponse(204), serverB.Logout(ada));
        Assert.Equal(401, serverA.WhoAmI(ada).Status);
        Assert.Equal(401, serverB.WhoAmI(ada).Status);
        Assert.Equal(200, serverB.WhoAmI(alan).Status);
    }
}
