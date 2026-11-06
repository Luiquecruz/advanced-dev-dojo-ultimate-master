# AI in .NET Apps

After this lesson you can call a language model from a .NET service through `Microsoft.Extensions.AI`, keep the provider swappable behind `IChatClient`, add caching, telemetry and tool calling as middleware, and decide when a feature needs the Microsoft Agent Framework instead. The engineering practice around models (prompt design, evaluation, cost and safety) is the subject of this platform's AI Engineering track; this lesson covers the .NET plumbing.

You need: 04/04 (cancellation), 04/05 (`IAsyncEnumerable`), 05/02 (dependency injection), 09/02 (test doubles), 10/05 (`HttpClient` handlers and resilience) and 11/04 (OpenTelemetry).

## One abstraction, many providers

A language model is an external HTTP service: you send messages and get a response. Each vendor ships its own SDK, and code written against one SDK must be rewritten to switch vendors, with logging, caching and retries built by hand each time.

`Microsoft.Extensions.AI` defines a shared abstraction instead: `IChatClient`, which provider libraries implement, plus a builder that layers middleware around it, in the same spirit as the `HttpClient` handler pipeline from 10/05. Application code depends on `IChatClient`; the provider is one registration line.

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

`GetResponseAsync` takes the whole conversation; most services are stateless, so you append the response messages (`history.AddMessages(response)`) and send the list again on the next turn. `GetStreamingResponseAsync` returns an `IAsyncEnumerable<ChatResponseUpdate>` for token-by-token output (04/05).

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

Each `Use*` call wraps the client, like the delegating handlers of 10/05, and order matters: here a cache hit returns before any tool call or model request. `UseOpenTelemetry` emits spans and metrics that follow the OpenTelemetry semantic conventions for generative AI, so model calls show up in the same traces as your HTTP and database spans (11/04); add `"Catalog.AI"` with `AddSource`. Swapping to Azure OpenAI, a local Ollama model or a test fake changes one registration line. `AddKeyedChatClient` registers several pipelines side by side, for example a cheap model for classification and a stronger one for writing.

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

## Common mistakes

- **The vendor SDK's client injected everywhere.** Every consumer now depends on one provider, and switching vendors, adding a cache or faking the model in a test means touching all of them. Depend on `IChatClient`.
- **No cancellation token.** A model call can take many seconds; when the user closes the page, the request keeps running and you still pay for it. Pass the request's token to `GetResponseAsync`.
- **Unvalidated tool arguments.** The model chooses the arguments, so a tool that trusts them can read another customer's data. Validate them like any user input.
- **An agent framework for a single prompt.** It adds concepts and dependencies that one `GetResponseAsync` call does not need. Call `IChatClient.GetResponseAsync` directly, and add an agent framework only when the workflow needs multi-step planning or several agents.

## In practice

- Depend on `IChatClient` in application code, and keep the provider choice and model name in configuration.
- Put model calls behind your own service with timeouts and cancellation; a model call is a slow, paid, external HTTP call, and the rules of 10/05 apply.
- Never send secrets or unnecessary personal data in prompts, and log prompts only where your data policy allows it (`EnableSensitiveData` on the telemetry client is off by default for a reason; setting `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT=true` turns it on without code changes).
- In unit tests, substitute a fake `IChatClient`; evaluate real model behavior separately, as the AI Engineering track explains.
- Try it locally: write a fake `IChatClient` that returns a fixed `ChatResponse` and unit-test a service that depends on it.

## Check yourself

1. What changes in your code when you move from OpenAI to a local Ollama model, if every consumer depends on `IChatClient`?
2. Why does the order of `UseDistributedCache()` and `UseFunctionInvocation()` matter?
3. Give one feature that needs only `IChatClient` and one that justifies the Agent Framework.
