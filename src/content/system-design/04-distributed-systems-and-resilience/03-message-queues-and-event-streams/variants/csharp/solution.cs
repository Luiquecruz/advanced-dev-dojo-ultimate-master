// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
long time = 0;
var queue = new MessageQueue(visibilityTimeoutMs: 30_000, maxReceives: 3, now: () => time);
var charged = 0;
var consumer = new IdempotentConsumer(_ => charged++);
queue.Send(new { OrderId = 42 });
var first = queue.Receive();
if (first is not null)
{
    consumer.Handle(first);
}
time += 30_000;
var again = queue.Receive();
if (again is null)
{
    Console.WriteLine($"redelivered: nothing charged: {charged}");
}
else
{
    Console.WriteLine($"redelivered: {again.Id} receiveCount: {again.ReceiveCount} applied again: {consumer.Handle(again)}");
    Console.WriteLine($"acked: {queue.Ack(again.Id)} charged: {charged}");
}

public record QueueMessage(string Id, object? Body, int ReceiveCount);

public class MessageQueue
{
    private readonly long _visibilityTimeoutMs;
    private readonly int _maxReceives;
    private readonly Func<long> _now;
    private readonly List<StoredMessage> _messages = [];
    private readonly List<QueueMessage> _deadLetters = [];
    private int _nextId = 1;

    public MessageQueue(long visibilityTimeoutMs, int maxReceives, Func<long> now)
    {
        _visibilityTimeoutMs = visibilityTimeoutMs;
        _maxReceives = maxReceives;
        _now = now;
    }

    public string Send(object? body)
    {
        var id = $"m{_nextId++}";
        _messages.Add(new StoredMessage(id, body, visibleAt: _now()));
        return id;
    }

    public QueueMessage? Receive()
    {
        var time = _now();
        var index = _messages.FindIndex(message => message.VisibleAt <= time);
        while (index != -1 && _messages[index].ReceiveCount >= _maxReceives)
        {
            _deadLetters.Add(_messages[index].Snapshot());
            _messages.RemoveAt(index);
            index = _messages.FindIndex(message => message.VisibleAt <= time);
        }
        if (index == -1)
        {
            return null;
        }
        var delivered = _messages[index];
        delivered.ReceiveCount += 1;
        delivered.VisibleAt = time + _visibilityTimeoutMs;
        return delivered.Snapshot();
    }

    public bool Ack(string id) => _messages.RemoveAll(message => message.Id == id) > 0;

    public IReadOnlyList<QueueMessage> DeadLetters() => _deadLetters.ToList();

    private sealed class StoredMessage(string id, object? body, long visibleAt)
    {
        public string Id { get; } = id;
        public object? Body { get; } = body;
        public int ReceiveCount { get; set; }
        public long VisibleAt { get; set; } = visibleAt;

        public QueueMessage Snapshot() => new(Id, Body, ReceiveCount);
    }
}

public class IdempotentConsumer
{
    private readonly Action<object?> _handler;
    private readonly HashSet<string> _processed = [];

    public IdempotentConsumer(Action<object?> handler)
    {
        _handler = handler;
    }

    public bool Handle(QueueMessage message)
    {
        if (_processed.Contains(message.Id))
        {
            return false;
        }
        _handler(message.Body);
        _processed.Add(message.Id);
        return true;
    }
}
