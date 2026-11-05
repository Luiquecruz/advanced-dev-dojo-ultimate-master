# HTTP Semantics and Problem Details

A client of your API decides what to do from the status code first and the body second. After this lesson you can pick the right status code for each outcome, return errors in the standard Problem Details format (RFC 9457), turn exceptions into consistent responses in one place with `IExceptionHandler`, and use endpoint filters for checks that several endpoints share.

## Coming from PHP/Magento

Magento's REST layer maps exceptions to statuses for you: `NoSuchEntityException` becomes 404, `InputException` and `LocalizedException` become 400, `AuthorizationException` becomes 401, and anything else becomes 500 with a `{"message": ..., "parameters": ...}` body. In developer mode the trace is included.

ASP.NET Core has no such mapping. An exception your code throws is a **500** unless you map it, and the body format is whatever you configure. The equivalent of Magento's developer mode is the Developer Exception Page, which is on only in the `Development` environment. Two habits to drop: returning 200 with `{"success": false}`, and letting domain exceptions reach the client as 500s.

## Choosing a status code

RFC 9110 defines the semantics. The ones a catalog API uses daily:

| Outcome | Status |
| --- | --- |
| Read succeeded | 200 OK |
| Resource created (send a `Location` header with its URL) | 201 Created |
| Update or delete succeeded, nothing to return | 204 No Content |
| Malformed input or failed validation | 400 Bad Request |
| Not authenticated / authenticated but not allowed (module 08) | 401 / 403 |
| Resource does not exist | 404 Not Found |
| Conflicts with current state (duplicate SKU, stale version) | 409 Conflict |
| Request body in a format the endpoint does not accept | 415 Unsupported Media Type |
| Well-formed content the server cannot process | 422 Unprocessable Content |
| Bug or unexpected failure | 500 Internal Server Error |

Two properties of methods matter for clients and proxies. `GET`, `HEAD`, `OPTIONS` and `TRACE` are **safe** (read-only by intent). Safe methods plus `PUT` and `DELETE` are **idempotent**: repeating the request has the same intended effect as sending it once, so a client may retry them after a network failure. `POST` is neither, which is why retried `POST /orders` calls need an idempotency key: a client-generated value the server stores so that it can recognize a repeat and return the first result.

400 versus 422 is a team convention: ASP.NET Core's built-in validation returns 400, so keep 400 for validation unless your API guidelines say otherwise, and document the choice.

## Problem Details

RFC 9457 (July 2023, obsoletes RFC 7807) defines a JSON error body served as `application/problem+json`, with five standard members: `type` (a URI that identifies the problem type; `about:blank` when absent), `title`, `status`, `detail` and `instance`. Problem types may add extension members, and clients must ignore extensions they do not recognize. The RFC also says not to expose implementation details such as stack dumps.

ASP.NET Core implements it with `IProblemDetailsService`:

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<OutOfStockExceptionHandler>();

var app = builder.Build();
app.UseExceptionHandler();   // unhandled exceptions -> Problem Details
app.UseStatusCodePages();    // empty 4xx/5xx responses -> Problem Details

app.MapGet("/products/{sku}", (string sku) =>
    TypedResults.Problem(
        title: "Product not found",
        detail: $"No product has SKU {sku}.",
        statusCode: StatusCodes.Status404NotFound));

app.Run();
```

With `AddProblemDetails`, the exception handler middleware, the status code pages middleware and the developer exception page all produce Problem Details for responses that have no body yet, as long as the client's `Accept` header allows JSON. `TypedResults.Problem` and `TypedResults.ValidationProblem` write one explicitly; the validation variant adds an `errors` member with messages per field. `CustomizeProblemDetails` in `AddProblemDetails(options => ...)` adds shared extensions, such as a correlation id, to every response.

## Mapping exceptions in one place

`IExceptionHandler` is the central catch block. Handlers are registered with `AddExceptionHandler<T>`, are **singletons**, run in registration order, and the first that returns `true` wins. They only run if `UseExceptionHandler` is in the pipeline.

```csharp
using Microsoft.AspNetCore.Diagnostics;

public sealed class OutOfStockException(string sku, int available)
    : Exception($"SKU {sku} has only {available} units.")
{
    public string Sku { get; } = sku;
    public int Available { get; } = available;
}

public sealed class OutOfStockExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not OutOfStockException outOfStock)
        {
            return false;
        }

        httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails =
            {
                Type = "https://errors.example.com/out-of-stock",
                Title = "Not enough stock",
                Detail = exception.Message,
                Status = StatusCodes.Status409Conflict,
                Extensions = { ["sku"] = outOfStock.Sku, ["available"] = outOfStock.Available }
            }
        });
    }
}
```

Anything no handler claims falls back to a generic 500 Problem Details without the exception message. Since .NET 10, the middleware no longer logs or emits metrics for exceptions a handler marks as handled; set `ExceptionHandlerOptions.SuppressDiagnosticsCallback` to change that, or log inside the handler. Exceptions are for the unexpected: for "not found" or "duplicate", return a result from the handler instead of throwing (04/01).

## Endpoint filters

An endpoint filter wraps one endpoint or a route group, like a Magento `around` plugin on the handler. It sees the bound arguments, can return a result early, or can call `next` and inspect the response:

```csharp
public sealed class RequireStoreCodeFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        if (!context.HttpContext.Request.Headers.TryGetValue("X-Store-Code", out var storeCode)
            || string.IsNullOrWhiteSpace(storeCode))
        {
            return TypedResults.Problem(
                title: "Missing store code",
                detail: "Send the X-Store-Code header.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        return await next(context);
    }
}

// app.MapGroup("/products").AddEndpointFilter<RequireStoreCodeFilter>();
```

Several filters run first-in first-out before `next` and in reverse after it. A filter class can take constructor dependencies from DI. Choose middleware (05/05) for concerns that apply to every request, including ones that match no endpoint; choose a filter when the concern belongs to specific endpoints or needs their arguments. Minimal API validation itself is an endpoint filter.

## In practice

- Register `AddProblemDetails`, `UseExceptionHandler` and `UseStatusCodePages` in every API, so that no error leaves without a consistent body. In .NET 10, also set `RouteHandlerOptions.ThrowOnBadRequest = false` so that binding failures stay 400 in Development (06/02).
- Map domain exceptions in one or a few `IExceptionHandler` classes; do not write `try/catch` in each handler.
- Give each error type a stable `type` URI that clients can switch on; `title` is for humans and may change.
- Never return stack traces or SQL errors outside Development.
- Return `201` with a `Location` header from creates, and `204` from deletes.

## Status as of 2026-11-05

- RFC 9457 is the current Problem Details standard. Some ASP.NET Core pages still link RFC 7807, which it obsoletes; the format is compatible.
- The .NET 10 change: handled exceptions no longer produce error logs or metrics by default (they did in .NET 8 and 9).

## Check yourself

1. A client retries `PUT /products/ABC` three times after a timeout. Why is that acceptable, and why would the same retry on `POST /orders` be risky?
2. Your handler throws `OutOfStockException` and no handler is registered for it. What does the client receive?
3. Which members of a Problem Details body should a client program read, and which are for humans?
4. Would you check an `X-Store-Code` header in middleware or in an endpoint filter? Why?
