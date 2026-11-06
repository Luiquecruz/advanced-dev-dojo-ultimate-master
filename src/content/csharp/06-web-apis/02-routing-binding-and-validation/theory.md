# Routing, Binding and Validation

An endpoint receives data from four places: the path, the query string, headers and the body. After this lesson you can write route templates, predict where ASP.NET Core takes each handler parameter from, read the status code a binding failure produces, and validate input with the minimal API validation that shipped in .NET 10, so that a bad request gets a 400 with field errors before your handler runs.

You need: 06/01 (minimal API handlers and `TypedResults`), 05/03 (data annotation attributes on options), 05/02 (services in DI), 04/04 (`CancellationToken`), 03/03 (iterators with `yield return`) and 02/03 (records and interfaces).

## Route templates and constraints

```csharp
// ... builder and app created as usual
app.MapGet("/products/{sku}", (string sku) => $"Product {sku}");
app.MapGet("/orders/{id:int}", (int id) => $"Order {id}");
app.MapGet("/media/{**path}", (string path) => $"File {path}");
```

`{id:int}` is a route constraint: the route only matches when the segment is an integer. Other constraints include `guid`, `alpha`, `minlength(4)` and `regex(...)`. `{**path}` is a catch-all that takes the rest of the URL.

Constraints are for telling routes apart, not for validation. The routing docs warn about it: with a constraint, `/orders/abc` matches nothing and returns **404**, while the client deserves a **400** explaining the problem. Use `{id:int}` when `/orders/{id:int}` and `/orders/{status}` must coexist; otherwise bind `int id` without a constraint and let binding or validation reject bad values.

## Where each parameter comes from

Each parameter has exactly one source, and conversion is strict: `int page` with `?page=two` never reaches your code. The minimal API binder picks the source of each parameter in this order:

1. An explicit attribute: `[FromRoute]`, `[FromQuery]`, `[FromHeader]`, `[FromBody]`, `[FromForm]`, `[FromServices]`, or `[AsParameters]`.
2. Special types: `HttpContext`, `HttpRequest`, `HttpResponse`, `ClaimsPrincipal`, `CancellationToken`, form files, `Stream`.
3. Types with a static `BindAsync` method.
4. `string` and types with a static `TryParse` (`int`, `Guid`, `DateOnly`, enums): from the route if the name is in the template, otherwise from the query string.
5. Services registered in DI.
6. Everything else: the JSON body, except on `GET`, `HEAD`, `OPTIONS` and `DELETE`, which never bind a body implicitly.

```csharp
// ... IProductStore (with Search and Add) registered in DI, as in 06/01
app.MapGet("/products", (
        [AsParameters] ProductQuery query,
        [FromHeader(Name = "X-Store-Code")] string? storeCode,
        IProductStore store,
        CancellationToken cancellationToken) =>
    TypedResults.Ok(store.Search(query, storeCode)));

app.MapPost("/products", (CreateProduct body, IProductStore store) =>
    TypedResults.Created($"/products/{body.Sku}", store.Add(body)));

public record ProductQuery(int Page = 1, int PageSize = 20, string? Search = null);
```

`[AsParameters]` groups simple parameters into one type: each property of `ProductQuery` is bound from the query string as if it were its own handler parameter. It is not general model binding; it does not recurse into nested objects. Headers always need `[FromHeader]`. `IProductStore` is resolved from DI because it is a registered service, and `CancellationToken` is aborted when the client disconnects (04/04).

Controllers infer sources with similar rules under `[ApiController]`: route names become `[FromRoute]`, registered services become `[FromServices]`, and other complex types become `[FromBody]`.

## When binding fails

Binding errors return before your handler runs:

| Failure | Status |
| --- | --- |
| `TryParse` fails on a route, query or header value | 400 |
| Required parameter missing (non-nullable, no default) | 400 |
| Malformed JSON body | 400 |
| Body sent with a content type other than JSON | 415 |
| A custom `BindAsync` throws | 500 |

In Development, `RouteHandlerOptions.ThrowOnBadRequest` defaults to `true`, so these failures throw `BadHttpRequestException`. With no other error handling you see the developer exception page. With `UseExceptionHandler` in the pipeline (06/03 and P2 use it), ASP.NET Core 10 turns that exception into a 500, so set `builder.Services.Configure<RouteHandlerOptions>(o => o.ThrowOnBadRequest = false);` or copy `BadHttpRequestException.StatusCode` to the response in an `IExceptionHandler`. In other environments it is `false` and the status code is written directly; with `AddProblemDetails` and `UseStatusCodePages`, that empty 400 or 415 gets a Problem Details body. Make a nullable parameter (`int? page`) or give it a default when a value is optional.

## Validation in .NET 10

.NET 10 added validation to minimal APIs, built on `Microsoft.Extensions.Validation` and the `System.ComponentModel.DataAnnotations` attributes you used on options in 05/03:

```csharp
using System.ComponentModel.DataAnnotations;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddValidation();
var app = builder.Build();

app.MapPost("/products", (CreateProduct body) => TypedResults.Ok(body));

app.MapGet("/products", ([Range(1, 1000)] int page = 1, [Range(1, 100)] int pageSize = 20) =>
    TypedResults.Ok(new { page, pageSize }));

app.Run();

public record CreateProduct(
    [Required, StringLength(64)] string Sku,
    [Required] string Name,
    [Range(0.01, 1_000_000)] decimal Price) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Sku.Contains(' '))
        {
            yield return new ValidationResult("SKU must not contain spaces.", [nameof(Sku)]);
        }
    }
}
```

What happens at runtime:

- A source generator finds the types used in your handler signatures at build time and generates validation metadata. Types reachable from them (nested objects, collection items) are included; error keys use paths such as `Lines[0].Sku`.
- An endpoint filter validates query, header and body values before the handler. On failure the client gets **400** with a Problem Details body whose `errors` member maps each field to its messages, written through `IProblemDetailsService` (06/03).
- Property attributes run first; `IValidatableObject.Validate` runs only when they pass, so cross-field rules can assume the basics hold.
- `.DisableValidation()` turns it off for one endpoint.

Limits to know: generation only covers the assembly where `AddValidation` is called, so types and endpoints in a class library need their own `AddValidation` call in that library. Unknown JSON properties are skipped, not rejected (`JsonUnmappedMemberHandling.Disallow` changes that). In .NET 10, nullable value type parameters such as `[Range(1, 10)] int? rating` are not validated (a known issue fixed in .NET 11). And this system is for minimal APIs and Blazor: controllers keep MVC model validation, where `[ApiController]` returns the 400 for you.

## Common mistakes

- **Forgetting `AddValidation()`.** The attributes compile and do nothing: invalid input reaches the handler, and nothing logs a warning. Call `builder.Services.AddValidation()` and test that a bad body returns 400.
- **A complex type on a `GET`.** `GET /products` with a `ProductFilter filter` parameter is inferred as a body, which `GET` does not allow, so building the endpoint throws `InvalidOperationException` ("Body was inferred but the method does not allow inferred body parameters"), which breaks every route, not one request. Use `[AsParameters]` to read it from the query string.
- **A route constraint as validation.** `/orders/{id:int}` makes `/orders/abc` a 404, and the client learns nothing. Bind `int id` without a constraint so a bad value gets a 400.

## In practice

- Bind complex query filters with `[AsParameters]`, headers with `[FromHeader]`, and keep bodies for `POST`, `PUT` and `PATCH`.
- Use attributes for shape rules (required, length, range) and `IValidatableObject` for rules that span fields. Rules that need the database, such as "SKU already exists", belong in the handler or a service, returning 409, because they depend on state rather than on the request.
- Add a test that sends an invalid body and expects 400. It is the cheapest guard against forgetting `AddValidation`.
- FluentValidation is a widely used third-party library; it is not built in, so it runs where you call it (a filter or the handler).

## Check yourself

1. Why is `/orders/{id:int}` the wrong tool for rejecting `/orders/abc`, and what should the client receive instead?
2. A `GET /products` handler takes a `ProductFilter filter` parameter and fails. Why, and what are two fixes?
3. You moved your endpoints and request types into a class library and validation stopped. What happened?
4. Which rule belongs in an attribute, which in `IValidatableObject`, and which in the handler: "price above zero", "end date after start date", "SKU not already taken"?
