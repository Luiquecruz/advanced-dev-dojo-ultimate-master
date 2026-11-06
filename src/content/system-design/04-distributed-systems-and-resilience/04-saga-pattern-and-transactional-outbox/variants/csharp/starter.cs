// Top-level statements: Run executes these lines and prints the results; the tests ignore them.
var log = new List<string>();
Task Append(string entry)
{
    log.Add(entry);
    return Task.CompletedTask;
}

var result = await Saga.RunSagaAsync(
    [
        new SagaStep<string>("create order", _ => Append("order created"), _ => Append("order cancelled")),
        new SagaStep<string>("charge card", _ => Append("card charged"), _ => Append("payment refunded")),
        new SagaStep<string>("reserve items", _ => throw new InvalidOperationException("out of stock"), _ => Append("items released")),
    ],
    "o-1");
Console.WriteLine($"status: {result.Status}, failed step: {result.FailedStep}");
Console.WriteLine($"completed: {string.Join(", ", result.Completed)}; compensated: {string.Join(", ", result.Compensated)}");
Console.WriteLine($"log: {string.Join(", ", log)}");

var charges = 0;
var charge = new IdempotentHandler<int, string>(amount => Task.FromResult($"charge {++charges} of {amount}"));
Console.WriteLine($"{await charge.HandleAsync("key-1", 40)} / {await charge.HandleAsync("key-1", 40)}");

public record SagaStep<TContext>(string Name, Func<TContext, Task> Action, Func<TContext, Task> Compensate);

public record SagaResult(
    string Status,
    IReadOnlyList<string> Completed,
    IReadOnlyList<string> Compensated,
    IReadOnlyList<string> FailedCompensations,
    string? FailedStep = null);

public static class Saga
{
    public static async Task<SagaResult> RunSagaAsync<TContext>(IEnumerable<SagaStep<TContext>> steps, TContext context)
    {
        var completed = new List<string>();
        foreach (var step in steps)
        {
            try
            {
                await step.Action(context);
                completed.Add(step.Name);
            }
            catch (Exception)
            {
                // TODO: compensate the completed steps in reverse order, keep going when a compensation fails
                return new SagaResult("compensated", completed, [], [], step.Name);
            }
        }
        return new SagaResult("completed", completed, [], []);
    }
}

public class IdempotentHandler<TRequest, TResponse>
{
    private readonly Func<TRequest, Task<TResponse>> _handler;

    public IdempotentHandler(Func<TRequest, Task<TResponse>> handler)
    {
        _handler = handler;
    }

    public Task<TResponse> HandleAsync(string key, TRequest request)
    {
        // TODO: store the task by key so a retry with the same key does not run the handler again
        // TODO: forget the key when the handler fails, so a later retry runs it again
        return _handler(request);
    }
}
