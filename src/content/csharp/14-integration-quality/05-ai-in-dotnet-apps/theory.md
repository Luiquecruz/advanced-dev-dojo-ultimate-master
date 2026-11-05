# AI in .NET Apps

After this lesson you can call a language model from a .NET service through `Microsoft.Extensions.AI`, keep the provider swappable behind `IChatClient`, add caching, telemetry and tool calling as middleware, and decide when a feature needs the Microsoft Agent Framework instead. The engineering practice around models (prompt design, evaluation, cost and safety) is the subject of this platform's AI Engineering track; this lesson covers the .NET plumbing.

## Coming from PHP/Magento

In PHP you usually call a model through the vendor's SDK or a plain Guzzle request to its REST API, inside a Magento service class, perhaps behind your own interface. Switching vendors means rewriting that class, and logging, caching and retries are hand-made.

.NET has a shared abstraction instead. `Microsoft.Extensions.AI` defines `IChatClient`, which provider libraries implement, plus a builder that layers middleware around it, in the same spirit as the `HttpClient` handler pipeline from module 10 lesson 05. The trap is the PHP reflex of injecting the vendor SDK's own client class everywhere: the code then depends on one provider, and you lose the shared middleware, telemetry and test doubles.

## The packages

- `Microsoft.Extensions.AI.Abstractions`: `IChatClient`, `IEmbeddingGenerator<TInput, TEmbedding>`, `ChatMessage`, `ChatOptions`. Provider libraries reference only this.
- `Microsoft.Extensions.AI`: the builder and the middleware (function invocation, caching, logging, OpenTelemetry). Applications reference this.
- A provider adapter, for example `Microsoft.Extensions.AI.OpenAI` (`AsIChatClient()` over the OpenAI SDK), or a library that implements `IChatClient` directly, such as OllamaSharp for local models.

## One call

```csharp
using Microsoft.Extensions.AI;
using OpenAI;

IChatClient chat = new OpenAIClient(apiKey).GetChatClient("gpt-4o-mini").AsIChatClient(); // apiKey from configuration

List<ChatMessage> history =
[
    new(ChatRole.System, "You write short, factual product descriptions."),
    new(ChatRole.User, "Describe SKU MUG-042: blue stoneware mug, 350 ml.")
];

ChatResponse response = await chat.GetResponseAsync(history, new ChatOptions { Temperature = 0.2f });
Console.WriteLine(response.Text);
```

`GetResponseAsync` takes the whole conversation; most services are stateless, so you append the response messages (`history.AddMessages(response)`) and send the list again on the next turn. `GetStreamingResponseAsync` returns an `IAsyncEnumerable<ChatResponseUpdate>` for token-by-token output (module 04 lesson 05).

## Registering a pipeline in DI

```csharp
using Microsoft.Extensions.AI;
using OpenAI;

builder.Services.AddDistributedMemoryCache(); // Redis in production
builder.Services.AddChatClient(services =>
        new OpenAIClient(builder.Configuration["AI:ApiKey"]).GetChatClient("gpt-4o-mini").AsIChatClient())
    .UseDistributedCache()
    .UseFunctionInvocation()
    .UseOpenTelemetry(sourceName: "Catalog.AI")
    .UseLogging();

// Consumers depend on the abstraction only.
public sealed class DescriptionWriter(IChatClient chat)
{
    public async Task<string> WriteAsync(string facts, CancellationToken ct)
    {
        var response = await chat.GetResponseAsync(
            [new(ChatRole.System, "Write one paragraph."), new(ChatRole.User, facts)],
            cancellationToken: ct);
        return response.Text;
    }
}
```

Each `Use*` call wraps the client, like the delegating handlers of module 10 lesson 05, and order matters: here a cache hit returns before any tool call or model request. `UseOpenTelemetry` emits spans and metrics that follow the OpenTelemetry semantic conventions for generative AI, so model calls show up in the same traces as your HTTP and database spans (module 11 lesson 04); add `"Catalog.AI"` with `AddSource`. Swapping to Azure OpenAI, a local Ollama model or a test fake changes one registration line. `AddKeyedChatClient` registers several pipelines side by side, for example a cheap model for classification and a stronger one for writing.

## Tools

```csharp
using System.ComponentModel;

[Description("Gets the current stock level for a SKU.")]
static async Task<int> GetStock(string sku) => await Task.FromResult(42); // ... call your stock service

var options = new ChatOptions { Tools = [AIFunctionFactory.Create(GetStock)] };
var answer = await chat.GetResponseAsync("Is MUG-042 in stock?", options);
```

With `UseFunctionInvocation()` in the pipeline, when the model asks for `GetStock`, the client runs the .NET method, sends the result back and returns the model's final answer. Treat every tool as an API exposed to untrusted input: the model chooses the arguments, so validate them and give tools the least privilege they need.

## Where the Agent Framework fits

Microsoft's guidance: `Microsoft.Extensions.AI` alone is not an agent framework. A one-shot call, a chat feature or a tool-calling loop needs nothing more. When the system must pursue a goal across many steps, make decisions, keep session state or coordinate several agents with workflows, use the **Microsoft Agent Framework** (`Microsoft.Agents.AI`). It is the direct successor of Semantic Kernel and AutoGen, built by the same teams, and any provider usable with `Microsoft.Extensions.AI` works with it. Start with plain `IChatClient`; move up only when orchestration is the real problem.

## In practice

- Depend on `IChatClient` in application code, and keep the provider choice and model name in configuration.
- Put model calls behind your own service with timeouts and cancellation; a model call is a slow, paid, external HTTP call, and the rules of module 10 lesson 05 apply.
- Never send secrets or unnecessary personal data in prompts, and log prompts only where your data policy allows it (`EnableSensitiveData` on the telemetry client is off by default for a reason; setting `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true` turns it on without code changes).
- In unit tests, substitute a fake `IChatClient`; evaluate real model behavior separately, as the AI Engineering track explains.
- Try it locally: write a fake `IChatClient` that returns a fixed `ChatResponse` and unit-test a service that depends on it.
- Common mistakes: the vendor SDK injected everywhere, no cancellation token, unvalidated tool arguments, and an agent framework adopted for a single prompt.

## Status as of 2026-11-05

- `Microsoft.Extensions.AI` and `Microsoft.Extensions.AI.OpenAI` are at 10.11.0 stable on NuGet (Microsoft's chat quickstart, dated 2026-03-04, still installs the OpenAI adapter with `--prerelease`).
- `Microsoft.Agents.AI` 1.0.0 was published on 2026-04-02 and 1.27.0 is the latest stable version; the Agent Framework overview is dated 2026-10-23.

## Check yourself

1. What changes in your code when you move from OpenAI to a local Ollama model, if every consumer depends on `IChatClient`?
2. Why does the order of `UseDistributedCache()` and `UseFunctionInvocation()` matter?
3. Give one feature that needs only `IChatClient` and one that justifies the Agent Framework.
