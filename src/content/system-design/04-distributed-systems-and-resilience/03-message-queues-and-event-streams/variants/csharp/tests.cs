using Dojo;

public static class MessageQueueTests
{
    private sealed record Order(int OrderId);

    [Test("send returns m1, m2, ... and receive delivers visible messages in send order, hiding each one it delivers")]
    public static void DeliversInSendOrder()
    {
        long time = 0;
        var queue = new MessageQueue(visibilityTimeoutMs: 1_000, maxReceives: 5, now: () => time);
        Assert.Equal("m1", queue.Send("a"));
        Assert.Equal("m2", queue.Send("b"));
        Assert.Equal(new QueueMessage("m1", "a", 1), queue.Receive());
        Assert.Equal(new QueueMessage("m2", "b", 1), queue.Receive());
        Assert.Null(queue.Receive());
        time = 1_000;
        Assert.Equal(new QueueMessage("m1", "a", 2), queue.Receive());
        Assert.Equal(new QueueMessage("m2", "b", 2), queue.Receive());
    }

    // beginner mistake: assuming exactly-once delivery, so a crash before ack applies the effect twice (or the message is deleted on receive and lost)
    [Test("an un-acked message is delivered again after the visibility timeout and the idempotent consumer applies it once")]
    public static void RedeliveredMessageAppliedOnce()
    {
        long time = 0;
        var queue = new MessageQueue(visibilityTimeoutMs: 30_000, maxReceives: 5, now: () => time);
        var charges = new List<object?>();
        var consumer = new IdempotentConsumer(charges.Add);
        queue.Send(new Order(42));
        var first = Assert.NotNull(queue.Receive());
        Assert.True(consumer.Handle(first));
        time = 29_999;
        Assert.Null(queue.Receive());
        time = 30_000;
        var again = Assert.NotNull(queue.Receive());
        Assert.Equal(new QueueMessage(first.Id, new Order(42), 2), again);
        Assert.False(consumer.Handle(again));
        Assert.SequenceEqual([new Order(42)], charges);
    }

    [Test("ack deletes a message for good and returns false when it is no longer in the queue")]
    public static void AckDeletesForGood()
    {
        long time = 0;
        var queue = new MessageQueue(visibilityTimeoutMs: 100, maxReceives: 1, now: () => time);
        var id = queue.Send("job");
        queue.Receive();
        Assert.True(queue.Ack(id));
        Assert.False(queue.Ack(id));
        Assert.False(queue.Ack("m99"));
        time = 1_000;
        Assert.Null(queue.Receive());
        Assert.SequenceEqual([], queue.DeadLetters());
    }

    [Test("a message received the maximum number of times without an ack moves to the dead letters and the next message is delivered")]
    public static void PoisonMessageMovesToDeadLetters()
    {
        long time = 0;
        var queue = new MessageQueue(visibilityTimeoutMs: 100, maxReceives: 2, now: () => time);
        queue.Send("poison");
        Assert.Equal(1, Assert.NotNull(queue.Receive()).ReceiveCount);
        time = 100;
        Assert.Equal(2, Assert.NotNull(queue.Receive()).ReceiveCount);
        queue.Send("healthy");
        time = 200;
        Assert.Equal(new QueueMessage("m2", "healthy", 1), queue.Receive());
        Assert.SequenceEqual([new QueueMessage("m1", "poison", 2)], queue.DeadLetters());
        Assert.False(queue.Ack("m1"));
    }

    [Test("the idempotent consumer records an id only after the handler succeeds")]
    public static void RecordsIdAfterSuccess()
    {
        var seen = new List<object?>();
        var fail = true;
        var consumer = new IdempotentConsumer(body =>
        {
            if (fail)
            {
                throw new InvalidOperationException("database unavailable");
            }
            seen.Add(body);
        });
        var error = Assert.Throws<InvalidOperationException>(() => consumer.Handle(new QueueMessage("m1", "a", 1)));
        Assert.Equal("database unavailable", error.Message);
        fail = false;
        Assert.True(consumer.Handle(new QueueMessage("m1", "a", 2)));
        Assert.True(consumer.Handle(new QueueMessage("m2", "b", 1)));
        Assert.False(consumer.Handle(new QueueMessage("m1", "a", 3)));
        Assert.SequenceEqual(["a", "b"], seen);
    }
}
