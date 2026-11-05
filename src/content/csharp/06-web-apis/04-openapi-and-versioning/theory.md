# OpenAPI and Versioning

An API without a machine-readable description gets integrated by guesswork. After this lesson you can generate an OpenAPI 3.1 document from your endpoints with the first-party `Microsoft.AspNetCore.OpenApi` package, make it accurate (response types, names, summaries), add a UI when you want one, and plan how the API will change without breaking its clients.

## Coming from PHP/Magento

Magento builds its schema from `webapi.xml` and the docblocks of service contract interfaces, serves it as Swagger at `/swagger`, and puts the version in every route (`/V1/products`). Two things transfer directly: the document is generated from code, not written by hand, and the version is part of the public contract.

The differences: ASP.NET Core reads the C# signatures (parameter types, `TypedResults`, metadata calls), not comments, unless you opt in to XML doc comments. It generates the document only; there is no built-in UI page. And the template maps the document in the `Development` environment only, so `/openapi/v1.json` is a 404 in Production unless you decide otherwise.

## Generating the document

The `webapi` template already includes the package. The setup is two lines:

```csharp
using Microsoft.AspNetCore.Http.HttpResults;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();               // document named "v1"

var app = builder.Build();
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();                        // GET /openapi/v1.json
    app.MapOpenApi("/openapi/{documentName}.yaml");
}

app.MapGet("/products/{sku}", GetProduct)
    .WithName("GetProduct")                  // becomes the operationId
    .WithTags("Products")
    .WithSummary("Get one product by SKU");

app.Run();

static Results<Ok<Product>, NotFound> GetProduct(string sku, IProductStore store) =>
    store.Find(sku) is { } product ? TypedResults.Ok(product) : TypedResults.NotFound();

// ... Product, IProductStore as in 06/01
```

The document is rebuilt on each request to the endpoint. What ends up in it:

- **Parameters** from the binding rules: `sku` as a path parameter, `[AsParameters]` properties as query parameters, the body record as the request schema.
- **Responses** from `TypedResults` and `Results<...>`: here a 200 with the `Product` schema and a 404. With plain `Results.Ok(...)` the generator cannot see the type, and you must add `.Produces<Product>()` and `.ProducesProblem(404)` by hand.
- **Names and text** from `WithName`, `WithTags`, `WithSummary` and `WithDescription`. Since .NET 10, XML doc comments are included too when the project sets `<GenerateDocumentationFile>true</GenerateDocumentationFile>`, but only on methods: comments on lambdas are not captured.

## OpenAPI 3.1 and what changed in .NET 10

.NET 10 generates **OpenAPI 3.1** by default (it was 3.0 before), with full JSON Schema draft 2020-12. Visible effects in the JSON:

- Nullable types are written as a `type` array that includes `"null"`, not `nullable: true`.
- `int` and `long` properties appear with a digits `pattern` instead of `type: integer`, because the ASP.NET Core JSON defaults also accept numbers written as strings. Setting `JsonSerializerOptions.NumberHandling` to `Strict` gives you `type: integer`.

If a client generator only understands 3.0, set `options.OpenApiVersion = Microsoft.OpenApi.OpenApiSpecVersion.OpenApi3_0` in `AddOpenApi`. The upgrade also moved the underlying OpenAPI.NET library to version 2.0, which breaks custom transformers written for .NET 9.

Transformers adjust the document after generation, for example to set the title or add a security scheme (module 08):

```csharp
// ... replaces the plain AddOpenApi() call above
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info.Title = "Catalog API";
        document.Info.Version = "v1";
        return Task.CompletedTask;
    });
});
```

`AddOperationTransformer` and `AddSchemaTransformer` work the same way for each operation and each schema. To produce the file at build time (for a client generator in CI, or to review API changes in pull requests), add `Microsoft.Extensions.ApiDescription.Server` and set `OpenApiGenerateDocumentsOnBuild` to `true`.

## Adding a UI

ASP.NET Core does not ship Swagger UI or any other viewer. Common choices are Scalar and Swagger UI from the Swashbuckle project, both third-party packages that read `/openapi/v1.json`. Swashbuckle and NSwag can also generate the document themselves; you will find them in many existing projects. For new code, keep generation first-party and choose any viewer.

## Versioning: what breaks a client

Version only when you must break the contract. Additive changes are compatible: a new endpoint, a new optional query parameter, a new property in a response (clients must ignore unknown properties). Breaking changes include removing or renaming a field, changing its type, making an optional input required, changing a status code a client relies on, or changing what an endpoint means.

Before reaching for a new version, prefer an additive alternative: add `priceWithTax` next to `price` instead of changing `price`.

When a break is unavoidable, choose where the version lives:

| Style | Example | Notes |
| --- | --- | --- |
| URL segment | `/v2/products` | Visible, easy to route and cache; Magento's style |
| Query string | `/products?api-version=2.0` | One URL per resource |
| Header | `Api-Version: 2.0` | Clean URLs, harder to try in a browser |
| Media type | `Accept: application/json;v=2.0` | Versions the representation, least familiar to clients |

ASP.NET Core has no built-in versioning. The `Asp.Versioning.Http` package (MIT, in the `dotnet` GitHub organization) is the usual choice for minimal APIs; `Asp.Versioning.Mvc` covers controllers.

```csharp
using Asp.Versioning;

// ... builder created as usual
builder.Services.AddProblemDetails();
builder.Services.AddApiVersioning();

// ... var app = builder.Build();
var products = app.NewVersionedApi().MapGroup("/products");

var v1 = products.MapGroup("/").HasApiVersion(1.0);
v1.MapGet("/{sku}", (string sku) => $"v1 {sku}");

var v2 = products.MapGroup("/").HasApiVersion(2.0);
v2.MapGet("/{sku}", (string sku) => $"v2 {sku}");

// GET /products/ABC?api-version=2.0
```

To publish one OpenAPI document per version, register `AddOpenApi("v1")` and `AddOpenApi("v2")`. Each document includes the endpoints whose group name matches it (`WithGroupName("v2")`) plus every endpoint without a group name; the project also offers an `Asp.Versioning.OpenApi` package for this.

## In practice

- Use `TypedResults` everywhere, so the document is right without `Produces` calls.
- Treat the OpenAPI file as part of the contract: generate it at build time and review its diff in pull requests.
- Decide whether to expose the document in Production; the template's Development-only default is deliberate.
- Start with no versioning and an additive-change policy. Add versioning on the first real break, and announce a sunset date for the old version.

## Status as of 2026-11-05

- OpenAPI 3.1 is the default output of `Microsoft.AspNetCore.OpenApi` in .NET 10.
- `Asp.Versioning.Http` 10.2.3 (NuGet, last updated 2026-08-22, MIT) targets .NET 10.
- `Swashbuckle.AspNetCore` 10.3.1 (2026-10-19) and `NSwag.AspNetCore` 14.7.1 (2026-04-20) are MIT and show no deprecation notice.

## Check yourself

1. Your endpoint returns `Results.Ok(product)` and the OpenAPI document shows no response schema. Give two fixes.
2. A client generator fails on `type: ["string", "null"]`. What changed and what can you set?
3. Which of these breaks clients: adding `stockStatus` to the product response, renaming `price` to `unitPrice`, adding an optional `?category=` filter?
4. Why does `/openapi/v1.json` return 404 after deploying an app created from the template?
