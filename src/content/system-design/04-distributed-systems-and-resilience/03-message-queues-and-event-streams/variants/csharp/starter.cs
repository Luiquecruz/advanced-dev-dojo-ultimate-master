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
    private readonly List<QueueMessage> _messages = [];
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
        _messages.Add(new QueueMessage(id, body, 0));
        return id;
    }

    public QueueMessage? Receive()
    {
        // TODO: keep the message in the queue, hide it until _now() + _visibilityTimeoutMs and count the receive
        // TODO: move a message already received _maxReceives times to the dead letters instead of delivering it
        if (_messages.Count == 0)
        {
            return null;
        }
        var message = _messages[0];
        _messages.RemoveAt(0);
        return message with { ReceiveCount = 1 };
    }

    public bool Ack(string id)
    {
        // TODO: delete the message for good and report whether it was still in the queue
        return _messages.Any(message => message.Id == id);
    }

    public IReadOnlyList<QueueMessage> DeadLetters()
    {
        // TODO: return the messages moved to the dead letters, in the order they were moved
        return [];
    }
}

public class IdempotentConsumer
{
    private readonly Action<object?> _handler;

    public IdempotentConsumer(Action<object?> handler)
    {
        _handler = handler;
    }

    public bool Handle(QueueMessage message)
    {
        // TODO: run the handler only once per message id, and only record the id when the handler succeeds
        _handler(message.Body);
        return true;
    }
}
