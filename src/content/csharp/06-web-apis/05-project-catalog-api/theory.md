# Project P2: Catalog REST API

You build the catalog API that the next projects extend: CRUD over products kept in memory, filtering and paging, validation, Problem Details for every error and an OpenAPI document. It takes about 8 hours with the .NET 10 SDK on your machine. When it passes the acceptance criteria, you have used every lesson of this module in one small, honest codebase. P3 replaces the in-memory store with EF Core, so keep storage behind an interface.

## Coming from PHP/Magento

This is the ASP.NET Core version of a custom Magento module that exposes `/V1/catalog/products` through `webapi.xml` and a repository interface. The interface boundary transfers: handlers talk to an `IProductStore`, as Magento controllers talk to a repository. Three things do not:

- The store lives as long as the process. In Magento every request reloads data; here a singleton `Dictionary` is shared by concurrent requests, so it must be thread-safe (`ConcurrentDictionary`) or locked.
- Errors are your job. Magento maps `NoSuchEntityException` to 404; here you return `TypedResults.NotFound()` or a `Problem`, and register `AddProblemDetails` so that every error has the same shape.
- Validation is off until you call `AddValidation()`.

```csharp
public interface IProductStore
{
    PagedResult<Product> List(int page, int pageSize, string? search);
    Product? Find(string sku);
    bool TryAdd(Product product);
    bool TryUpdate(Product product);
    bool Remove(string sku);
}

public record Product(string Sku, string Name, decimal Price, int Stock);
public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);
```

## Goal

A runnable `Catalog.Api` minimal API whose behavior and contract a client can rely on without reading your code: correct status codes, field-level validation errors, Problem Details for every failure and an accurate `/openapi/v1.json`.

## Features

- `GET /products?page=&pageSize=&search=`: paged list ordered by SKU, with `page` at least 1 and `pageSize` between 1 and 100, and `search` matching name or SKU.
- `GET /products/{sku}`: one product, or 404.
- `POST /products`: create; 201 with a `Location` header; 409 when the SKU exists.
- `PUT /products/{sku}`: replace name, price and stock; 204; 404 when missing.
- `DELETE /products/{sku}`: 204; 404 when missing.
- Validation with DataAnnotations: SKU required, at most 64 characters, no spaces; name required; price above zero; stock zero or more.
- `AddProblemDetails`, `UseExceptionHandler` and `UseStatusCodePages`, so that unknown routes and unhandled exceptions also return `application/problem+json`.
- Endpoints in a `ProductEndpoints` extension method with a `/products` route group, named handler methods, `TypedResults` and `Results<...>` return types.
- OpenAPI with `AddOpenApi` and `MapOpenApi`, a document title set by a transformer, and a summary on each endpoint.
- Seed data: 25 products at startup, enough for three pages of 10.

## Acceptance criteria

Run `dotnet run` and use the port printed in the console (`<port>` below). Every check must hold:

```bash
curl -i "http://localhost:<port>/products?page=2&pageSize=10"
# 200; JSON with items (10 products, SKUs 11th to 20th in order), page 2, pageSize 10, total 25

curl -i "http://localhost:<port>/products?page=0"
# 400; application/problem+json with an errors entry for page

curl -i -X POST "http://localhost:<port>/products" -H "Content-Type: application/json" \
  -d '{"sku":"","name":"","price":0,"stock":-1}'
# 400; errors lists sku, name, price and stock

curl -i -X POST "http://localhost:<port>/products" -H "Content-Type: application/json" \
  -d '{"sku":"NEW-1","name":"Mug","price":9.90,"stock":5}'
# 201; Location: /products/NEW-1. Sending it again returns 409 as Problem Details

curl -i "http://localhost:<port>/products/DOES-NOT-EXIST"
# 404; application/problem+json with title and status 404

curl -i -X DELETE "http://localhost:<port>/products/NEW-1"
# 204; a second DELETE returns 404

curl -s "http://localhost:<port>/openapi/v1.json"
# lists all five operations, the 201/204/400/404/409 responses and the Product schema
```

Also: `dotnet build` shows no warnings with nullable reference types enabled (the template default), and the same request always returns the same page (ordering does not depend on dictionary order).

## Suggested steps

1. `dotnet new webapi -n Catalog.Api`, delete the weather sample, and run it once to see `/openapi/v1.json`.
2. Write `Product`, `PagedResult<T>` and `IProductStore`, then `InMemoryProductStore` with a `ConcurrentDictionary<string, Product>` (case-insensitive key comparer) and seed data. Register it as a singleton.
3. Add the two `GET` endpoints in `ProductEndpoints` with `Results<Ok<Product>, NotFound>`. Check them with `curl`.
4. Add request records (`CreateProduct`, `UpdateProduct`) with validation attributes and `IValidatableObject` for the no-spaces rule, then `AddValidation()`. Send the invalid body from the criteria.
5. Add `POST`, `PUT` and `DELETE` with 201, 204 and 409. Keep the duplicate check in the store (`TryAdd`), not in a validation attribute. Declare the 409 in the return type, for example `Results<Created<Product>, Conflict<ProblemDetails>>` with `TypedResults.Conflict(problem)`, so OpenAPI sees it; `TypedResults.Problem` adds no response metadata.
6. Add `AddProblemDetails`, `UseExceptionHandler` and `UseStatusCodePages`. Request an unknown route and confirm a Problem Details 404. Set `RouteHandlerOptions.ThrowOnBadRequest = false`, or `?page=two` and malformed JSON return 500 instead of 400 under `dotnet run` (06/02).
7. Add summaries, names and a title transformer. Validation 400s are not in the document until you add `.ProducesValidationProblem()` to the endpoints (or the group); then read the OpenAPI JSON against the criteria.
8. Run every `curl` from the criteria and fix what differs.

## Stretch goals

- Write a short `.http` file with every request, so the checks run from the editor.
- Add an `IExceptionHandler` for a custom `CatalogException` that maps to 409 with a `type` URI.
- Add an endpoint filter that requires an `X-Store-Code` header on writes only.
- Serve the document as YAML too, and add Scalar or Swagger UI in Development.
- Add `ETag` on `GET /products/{sku}` and honor `If-None-Match` with 304.

## Where to get help

- Lessons: 06/01 minimal APIs and route groups, 06/02 binding and validation, 06/03 status codes, Problem Details and filters, 06/04 OpenAPI; 05/02 for singleton versus scoped lifetimes; 03/02 for the LINQ paging (`OrderBy`, `Skip`, `Take`).
- Microsoft Learn: [Tutorial: Create a Minimal API with ASP.NET Core](https://learn.microsoft.com/en-us/aspnet/core/tutorials/min-web-api?view=aspnetcore-10.0) and [Handle errors in ASP.NET Core APIs](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/error-handling-api?view=aspnetcore-10.0).
- balta.io: Fundamentos do ASP.NET 6 (minimal APIs and CRUD, on ASP.NET 6) and Fullstack .NET (backend modules on .NET 8).

## Check yourself

1. Why does the store need `ConcurrentDictionary` (or a lock) in ASP.NET Core when the same code in PHP would not?
2. Why is "SKU already exists" a 409 from the store and not a validation attribute?
3. What would break in your OpenAPI document if the handlers returned `IResult`?
4. Which part of this project changes when P3 moves storage to EF Core, and which part should not change at all?
