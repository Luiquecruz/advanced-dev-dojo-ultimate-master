// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
long clock = 0;
var store = new SessionStore(ttlMs: 1_000, now: () => clock);
var serverA = new Server("a", store);
var serverB = new Server("b", store);
var sessionId = serverA.Login("ada");
Console.WriteLine(serverB.WhoAmI(sessionId));
clock = 1_000;
Console.WriteLine(serverA.WhoAmI(sessionId));

public record HttpResponse(int Status, object? Body = null);
public record UserBody(string User, string Server);
public record ErrorBody(string Error);

public class SessionStore(long ttlMs, Func<long> now)
{
    private readonly Dictionary<string, SessionRecord> _sessions = [];

    public string Create(string user)
    {
        var sessionId = Guid.NewGuid().ToString();
        _sessions[sessionId] = new SessionRecord(user, now() + ttlMs);
        return sessionId;
    }

    public string? Get(string sessionId)
    {
        // TODO: an expired session (now() >= ExpiresAt) must be removed and return null
        return _sessions.TryGetValue(sessionId, out var record) ? record.User : null;
    }

    public void Destroy(string sessionId)
    {
        // TODO: remove the session
    }

    private sealed record SessionRecord(string User, long ExpiresAt);
}

public class Server(string name, SessionStore store)
{
    // TODO: this server remembers sessions in its own memory; keep them in the shared store instead
    private readonly Dictionary<string, string> _localSessions = [];

    public string Name { get; } = name;

    public string Login(string user)
    {
        var sessionId = Guid.NewGuid().ToString();
        _localSessions[sessionId] = user;
        return sessionId;
    }

    public HttpResponse WhoAmI(string sessionId)
    {
        if (!_localSessions.TryGetValue(sessionId, out var user))
        {
            return new HttpResponse(401, new ErrorBody("not logged in"));
        }
        return new HttpResponse(200, new UserBody(user, Name));
    }

    public HttpResponse Logout(string sessionId)
    {
        // TODO: end the session for every server that shares the store
        return new HttpResponse(204);
    }
}
