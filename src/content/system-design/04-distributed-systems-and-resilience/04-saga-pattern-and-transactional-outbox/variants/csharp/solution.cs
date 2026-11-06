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
        var completed = new List<SagaStep<TContext>>();
        foreach (var step in steps)
        {
            try
            {
                await step.Action(context);
                completed.Add(step);
            }
            catch (Exception)
            {
                return await CompensateAsync(completed, context, failedStep: step.Name);
            }
        }
        return new SagaResult("completed", NamesOf(completed), [], []);
    }

    private static async Task<SagaResult> CompensateAsync<TContext>(List<SagaStep<TContext>> completed, TContext context, string failedStep)
    {
        var compensated = new List<string>();
        var failedCompensations = new List<string>();
        for (var index = completed.Count - 1; index >= 0; index--)
        {
            var step = completed[index];
            try
            {
                await step.Compensate(context);
                compensated.Add(step.Name);
            }
            catch (Exception)
            {
                failedCompensations.Add(step.Name);
            }
        }
        return new SagaResult("compensated", NamesOf(completed), compensated, failedCompensations, failedStep);
    }

    private static List<string> NamesOf<TContext>(List<SagaStep<TContext>> steps) => steps.Select(step => step.Name).ToList();
}

public class IdempotentHandler<TRequest, TResponse>
{
    private readonly Func<TRequest, Task<TResponse>> _handler;
    private readonly Dictionary<string, Task<TResponse>> _executions = [];

    public IdempotentHandler(Func<TRequest, Task<TResponse>> handler)
    {
        _handler = handler;
    }

    public async Task<TResponse> HandleAsync(string key, TRequest request)
    {
        if (_executions.TryGetValue(key, out var running))
        {
            return await running;
        }
        var execution = _handler(request);
        _executions[key] = execution;
        try
        {
            return await execution;
        }
        catch (Exception)
        {
            _executions.Remove(key);
            throw;
        }
    }
}
