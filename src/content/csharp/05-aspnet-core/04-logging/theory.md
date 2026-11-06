# Logging with ILogger

After this lesson you can write structured logs with `ILogger<T>`, choose a level for each message, filter noisy categories in configuration, attach context to a group of messages with scopes, and avoid the placeholder-order bug that silently writes wrong values. Exporting logs to a backend and correlating them with traces comes in module 11.

You need: 05/02 (constructor injection and primary constructors), 05/03 (configuration keys and `__` in environment variables), 04/01 (`try`/`catch` and `throw;`) and 02/03 (attributes).

## What logs are for

A deployed app runs without anyone watching it. Logs are the messages it writes about what it did, so that someone can find out later why an order failed or a request was slow. .NET has one logging abstraction, `ILogger`, injected everywhere, and pluggable **providers** that decide where messages go.

Three things shape how you use it:

- **Every logger has a category**, usually the class name, and configuration filters messages by category and level.
- **Messages are templates with named placeholders**, filled by the position of the arguments, not by their names.
- **There is no built-in file logger.** The default providers write to the console, the debugger and the platform's event system. In containers you log to stdout and the platform collects it; for files or a log backend you add a provider (module 11 uses OpenTelemetry).

## Injecting a logger

```csharp
public sealed class OrderService(ILogger<OrderService> logger, IOrderRepository orders)
{
    public async Task PlaceAsync(Order order)
    {
        logger.LogInformation("Placing order {OrderId} for customer {CustomerId}",
            order.Id, order.CustomerId);

        try
        {
            await orders.SaveAsync(order);
        }
        catch (DbException ex)
        {
            logger.LogError(ex, "Saving order {OrderId} failed", order.Id);
            throw;
        }
    }
}
// ... Order, IOrderRepository; DbException is in System.Data.Common
```

`ILogger<OrderService>` sets the category to the fully qualified type name, such as `Shop.Orders.OrderService`. The exception goes in the first argument of `LogError`, not in the template, so providers keep the stack trace as a separate field.

## Message templates, not strings

The template is passed to the logging system together with the arguments. A structured provider stores `OrderId` and `CustomerId` as fields, so you can later query "every log line for order 1042" without parsing text.

```csharp
// Structured: one template, values kept as fields
logger.LogWarning("Stock for {Sku} is below {Threshold}", sku, threshold);

// Not structured: the values are baked into a new string every call
logger.LogWarning($"Stock for {sku} is below {threshold}");
```

The interpolated version produces the same text in the console but loses the fields, allocates a new string even when the level is disabled, and creates a different "message" for every SKU, which breaks grouping in log tools.

Order matters. `logger.LogInformation("{Pears}, {Bananas}, {Apples}", apples, pears, bananas)` prints the apples count where it says `Pears`. The names in the template only label the fields; the compiler does not match them with your variable names, so this is an easy bug to write and a hard one to see.

## Levels and filtering

| Level | Value | Use for |
| --- | --- | --- |
| `Trace` | 0 | very detailed diagnostics, may contain sensitive data; off in production |
| `Debug` | 1 | development diagnostics |
| `Information` | 2 | normal flow worth recording: an order placed, a job finished |
| `Warning` | 3 | unexpected but handled: a retry, a fallback |
| `Error` | 4 | an operation failed |
| `Critical` | 5 | the app or a dependency is down |
| `None` | 6 | disables logging for a category |

Filtering is configuration, so you change it without recompiling. The template's `appsettings.json` has:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

`Default` applies to every category without a more specific entry. `Microsoft.AspNetCore` matches every category that starts with it, which silences the framework's per-request messages below `Warning`. To debug one area, raise one category, for example `"Shop.Orders": "Debug"`, through `appsettings.Development.json` or an environment variable such as `Logging__LogLevel__Shop.Orders=Debug`. A variable name with a dot can be set through Docker `-e` or a Kubernetes `env` entry, but Bash cannot `export` it; the same entry also fits in `appsettings.{Environment}.json`. An edited appsettings file reloads while the app runs; a changed environment variable needs a process restart. If no level is set at all, the default is `Information`.

## Scopes

A scope attaches the same fields to every message logged inside it, even from other classes:

```csharp
// ... inside OrderService.PlaceAsync, with an injected inventory service
using (logger.BeginScope(new Dictionary<string, object> { ["OrderId"] = order.Id }))
{
    logger.LogInformation("Reserving stock");
    await inventory.ReserveAsync(order); // its logs carry OrderId too
}
```

Providers decide whether to show scopes. The console provider prints them when `IncludeScopes` is enabled for it, and `builder.Logging.AddJsonConsole()` writes each entry as JSON, which is what a log collector wants from a container. ASP.NET Core already opens a scope per request with values such as the request id and path.

## High-performance logging

For hot paths, the `[LoggerMessage]` source generator writes the logging code at compile time. It checks the level before doing any work and avoids boxing and temporary allocations:

```csharp
public sealed partial class StockMonitor(ILogger<StockMonitor> logger)
{
    [LoggerMessage(Level = LogLevel.Warning, Message = "Stock for {Sku} is below {Threshold}")]
    private partial void LogLowStock(string sku, int threshold);

    public void Check(string sku, int quantity)
    {
        if (quantity < 5)
        {
            LogLowStock(sku, 5);
        }
    }
}
```

A `partial` method is declared in one place and implemented in another part of the same class; here the compiler generates the body. The method, and its class, must be `partial`, and the method returns `void`. Since .NET 9 the generator can take the logger from a primary constructor parameter, as here. The compiler reports misuse, such as a placeholder with no matching parameter.

## Common mistakes

- **Arguments in the wrong order.** `LogInformation("Order {OrderId} for {CustomerId}", customerId, orderId)` compiles and stores the customer id under `OrderId`. Pass arguments in the order of the placeholders.
- **String interpolation in a log call.** `LogWarning($"Stock for {sku} is low")` prints the same text but loses the `Sku` field and builds the string even when `Warning` is off. Use a template with arguments.
- **Logging `ex.Message` instead of the exception.** The stack trace is lost, so nobody can see where the failure happened. Pass the exception as the first argument: `LogError(ex, "...")`.

## In practice

- Inject `ILogger<T>` everywhere; do not create loggers by hand.
- Use templates with PascalCase placeholder names and never string interpolation in log calls. The .NET code-analysis rule CA2254 ("Template should be a static expression") flags interpolated templates, and CA1848 recommends `LoggerMessage` delegates for hot paths.
- Choose levels by what an operator should do: nothing (`Information`), look later (`Warning`), act now (`Error`, `Critical`).
- Never log passwords, tokens, full card numbers or personal data. The .NET redaction libraries (`Microsoft.Extensions.Compliance.Redaction`) help when you must log classified values.
- Serilog and NLog are common third-party libraries that plug into `ILogger`; your code keeps calling `ILogger`, only the providers change.

## Check yourself

1. Why does the interpolated version of a log call print the same text but still count as a defect?
2. `logger.LogInformation("{Sku} has {Quantity}", quantity, sku)`: what is printed, and which field holds which value?
3. How would you see `Debug` messages from one namespace in production for an hour without redeploying code?
4. Where do logs go by default in a container, and why is that not a problem?
