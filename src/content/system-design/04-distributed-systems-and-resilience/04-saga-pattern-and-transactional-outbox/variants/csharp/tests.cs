using Dojo;

public static class SagaTests
{
    private sealed record OrderContext(string OrderId);

    private sealed record Charge(string ChargeId, int Amount);

    private static SagaStep<OrderContext> RecordingStep(string name, List<string> log, bool fails = false, bool compensationFails = false) =>
        new(
            name,
            Action: context =>
            {
                log.Add($"do {name} {context.OrderId}");
                if (fails)
                {
                    throw new InvalidOperationException($"{name} failed");
                }
                return Task.CompletedTask;
            },
            Compensate: context =>
            {
                log.Add($"undo {name} {context.OrderId}");
                return compensationFails ? Task.FromException(new InvalidOperationException($"undo {name} failed")) : Task.CompletedTask;
            });

    [Test("the saga runs every action in order with the context and reports completed")]
    public static async Task RunsEveryActionInOrder()
    {
        var log = new List<string>();
        var result = await Saga.RunSagaAsync([RecordingStep("order", log), RecordingStep("payment", log), RecordingStep("inventory", log)], new OrderContext("o-1"));
        Assert.SequenceEqual(["do order o-1", "do payment o-1", "do inventory o-1"], log);
        Assert.Equal("completed", result.Status);
        Assert.SequenceEqual(["order", "payment", "inventory"], result.Completed);
        Assert.SequenceEqual([], result.Compensated);
        Assert.SequenceEqual([], result.FailedCompensations);
        Assert.Null(result.FailedStep);
    }

    // beginner mistake: compensating in forward order, compensating the failed step or running the steps after it
    [Test("a failing step stops the saga and compensates only the completed steps, in reverse order")]
    public static async Task CompensatesCompletedStepsInReverse()
    {
        var log = new List<string>();
        SagaStep<OrderContext>[] steps = [RecordingStep("order", log), RecordingStep("payment", log), RecordingStep("inventory", log, fails: true), RecordingStep("shipping", log)];
        var result = await Saga.RunSagaAsync(steps, new OrderContext("o-2"));
        Assert.SequenceEqual(["do order o-2", "do payment o-2", "do inventory o-2", "undo payment o-2", "undo order o-2"], log);
        Assert.Equal("compensated", result.Status);
        Assert.Equal("inventory", result.FailedStep);
        Assert.SequenceEqual(["order", "payment"], result.Completed);
        Assert.SequenceEqual(["payment", "order"], result.Compensated);
        Assert.SequenceEqual([], result.FailedCompensations);
    }

    [Test("a failing compensation is reported and the remaining compensations still run")]
    public static async Task FailedCompensationIsReported()
    {
        var log = new List<string>();
        SagaStep<OrderContext>[] steps = [RecordingStep("order", log), RecordingStep("payment", log, compensationFails: true), RecordingStep("inventory", log), RecordingStep("shipping", log, fails: true)];
        var result = await Saga.RunSagaAsync(steps, new OrderContext("o-3"));
        Assert.SequenceEqual(["undo inventory o-3", "undo payment o-3", "undo order o-3"], log.Skip(4));
        Assert.Equal("compensated", result.Status);
        Assert.SequenceEqual(["inventory", "order"], result.Compensated);
        Assert.SequenceEqual(["payment"], result.FailedCompensations);
    }

    [Test("the idempotent handler returns the stored result for a repeated key without running the handler again")]
    public static async Task RepeatedKeyReturnsStoredResult()
    {
        var calls = 0;
        var charge = new IdempotentHandler<int, Charge>(amount =>
        {
            calls++;
            return Task.FromResult(new Charge($"ch-{calls}", amount));
        });
        var first = await charge.HandleAsync("key-1", 40);
        Assert.Equal(first, await charge.HandleAsync("key-1", 40));
        Assert.Equal(1, calls);
        Assert.Equal(new Charge("ch-2", 40), await charge.HandleAsync("key-2", 40));
        Assert.Equal(2, calls);
    }

    [Test("concurrent retries share one execution and a failed attempt is not stored")]
    public static async Task ConcurrentRetriesShareOneExecution()
    {
        var gate = new TaskCompletionSource<string>(TaskCreationOptions.RunContinuationsAsynchronously);
        var calls = 0;
        var charge = new IdempotentHandler<string, string>(request =>
        {
            calls++;
            return gate.Task;
        });
        var first = charge.HandleAsync("key-1", "request");
        var retry = charge.HandleAsync("key-1", "request");
        await Task.Yield();
        gate.SetResult("done");
        Assert.SequenceEqual(["done", "done"], await Task.WhenAll(first, retry));
        Assert.Equal(1, calls);

        var attempts = 0;
        var send = new IdempotentHandler<string, string>(request =>
            ++attempts == 1 ? Task.FromException<string>(new TimeoutException("timeout")) : Task.FromResult("ok"));
        var error = await Assert.ThrowsAsync<TimeoutException>(() => send.HandleAsync("key-9", "request"));
        Assert.Equal("timeout", error.Message);
        Assert.Equal("ok", await send.HandleAsync("key-9", "request"));
        Assert.Equal(2, attempts);
    }
}
