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
        if (!_sessions.TryGetValue(sessionId, out var record))
        {
            return null;
        }
        if (now() >= record.ExpiresAt)
        {
            _sessions.Remove(sessionId);
            return null;
        }
        return record.User;
    }

    public void Destroy(string sessionId) => _sessions.Remove(sessionId);

    private sealed record SessionRecord(string User, long ExpiresAt);
}

public class Server(string name, SessionStore store)
{
    public string Name { get; } = name;

    public string Login(string user) => store.Create(user);

    public HttpResponse WhoAmI(string sessionId)
    {
        var user = store.Get(sessionId);
        if (user is null)
        {
            return new HttpResponse(401, new ErrorBody("not logged in"));
        }
        return new HttpResponse(200, new UserBody(user, Name));
    }

    public HttpResponse Logout(string sessionId)
    {
        store.Destroy(sessionId);
        return new HttpResponse(204);
    }
}
