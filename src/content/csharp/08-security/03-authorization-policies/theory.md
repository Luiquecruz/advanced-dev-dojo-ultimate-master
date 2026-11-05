# Authorization Policies

After this lesson you can protect endpoints with roles, claims and named policies, make "authenticated by default" the rule, write a custom requirement with its handler, and check access to one specific record (resource-based authorization), which is the check most APIs get wrong.

## Coming from PHP/Magento

Magento's admin authorization is a tree of ACL resources in `acl.xml` (`Magento_Catalog::products`), assigned to admin roles, and checked by `ADMIN_RESOURCE` in a controller or by `<resource ref="..."/>` in `webapi.xml`. For customer data, `webapi.xml` uses `<resource ref="self"/>` and a `%customer_id%` parameter that Magento fills from the token, so a customer can only reach their own cart.

What transfers: named permissions checked at the route, and the special treatment of "data that belongs to the caller".

The trap: ASP.NET Core has no `self` and no `%customer_id%` injection. A route like `GET /orders/{id}` with `RequireAuthorization()` only proves the caller signed in; it does not prove the order is theirs. You must load the record and check ownership in code. Also, ASP.NET Core has no ACL tree: there are roles, claims and **policies**, and you design the permission model.

## Applying authorization to endpoints

Minimal APIs use `RequireAuthorization`; controllers use `[Authorize]`. Both select a policy:

```csharp
using Microsoft.AspNetCore.Authorization;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddAuthentication().AddJwtBearer(options =>
{
    options.MapInboundClaims = false;                         // keep "sub", "role" as sent
    options.TokenValidationParameters.NameClaimType = "sub";
    options.TokenValidationParameters.RoleClaimType = "role"; // or RequireRole never matches
});

builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder()
        .RequireAuthenticatedUser()
        .Build())
    .AddPolicy("CatalogAdmin", policy => policy.RequireRole("admin"))
    .AddPolicy("CatalogWriter", policy => policy.RequireAssertion(context =>
        context.User.FindAll("scope")
            .SelectMany(claim => claim.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries))
            .Contains("catalog:write")));

var app = builder.Build();

app.MapGet("/health", () => "ok").AllowAnonymous();
app.MapGet("/products", () => Results.Ok());                                   // fallback: any signed-in user
app.MapPost("/products", () => Results.Created()).RequireAuthorization("CatalogWriter");
app.MapDelete("/products/{sku}", (string sku) => Results.NoContent()).RequireAuthorization("CatalogAdmin");

app.Run();
```

How the policy is chosen:

| Endpoint metadata | Policy applied |
| --- | --- |
| none | the **fallback policy**, which is `null` by default (no check at all) |
| `RequireAuthorization()` or `[Authorize]` with no name | the **default policy**: an authenticated user |
| `RequireAuthorization("CatalogAdmin")` | that named policy |
| `AllowAnonymous()` | no authorization failure is enforced |

Setting a fallback policy turns the model into "deny unless stated", which protects the endpoint someone forgets to mark. Static files served before the authorization middleware are not covered by it.

## Roles, claims and policies

- **Roles** are claims of the role type: role checks call `ClaimsPrincipal.IsInRole`, which looks for the identity's `RoleClaimType`. That type defaults to the long `ClaimTypes.Role` URI, so with `MapInboundClaims = false` (lesson 02) you must set `RoleClaimType = "role"`, as above, or every role check silently fails. `[Authorize(Roles = "admin,editor")]` means admin **or** editor; two `[Authorize]` attributes mean both. Role names are compared case-sensitively, so `Admin` is not `admin`. Policy names, in contrast, are looked up case-insensitively.
- **Claims** carry any fact: a scope, a tenant, a department. `RequireClaim("scope", "catalog:write")` passes when the user has a claim whose whole value equals `catalog:write`. That works when the token carries scopes as a JSON array (one claim per scope, as `dotnet user-jwts --scope` does), but many identity providers send one space-separated string (`"catalog:read catalog:write"`, the RFC 9068 format), which never equals a single scope. The `CatalogWriter` policy above splits each `scope` claim, so it accepts both shapes.
- A **policy** is a named set of requirements, and **all** of them must pass. `RequireRole("admin").RequireClaim("tenant", "br")` means admin and Brazilian tenant.

Prefer named policies over role strings scattered across endpoints. The endpoint says *what* it needs ("CatalogWriter"); `Program.cs` says *how* that is decided, and you can change the rule in one place. Microsoft also notes that roles tend to multiply and to grow too large for a token, which is why claims and scopes scale better for APIs.

## Custom requirements and handlers

When a rule is more than "has claim X", write a requirement (data) and a handler (logic):

```csharp
using Microsoft.AspNetCore.Authorization;

public sealed class BusinessHoursRequirement(int fromHour, int toHour) : IAuthorizationRequirement
{
    public int FromHour { get; } = fromHour;
    public int ToHour { get; } = toHour;
}

public sealed class BusinessHoursHandler(TimeProvider clock) : AuthorizationHandler<BusinessHoursRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, BusinessHoursRequirement requirement)
    {
        var hour = clock.GetLocalNow().Hour;
        if (hour >= requirement.FromHour && hour < requirement.ToHour)
        {
            context.Succeed(requirement);
        }
        return Task.CompletedTask;
    }
}

// Program.cs
// builder.Services.AddSingleton(TimeProvider.System);
// builder.Services.AddSingleton<IAuthorizationHandler, BusinessHoursHandler>();
// .AddPolicy("PriceChanges", policy => policy.RequireRole("admin")
//     .AddRequirements(new BusinessHoursRequirement(8, 18)));
```

The rules of evaluation:
- A handler signals success with `context.Succeed(requirement)`. Doing nothing is not a failure; another handler may still succeed.
- Several handlers for the same requirement combine with **OR** (a badge or a temporary sticker opens the door). Several requirements in one policy combine with **AND**.
- `context.Fail()` forces failure even if another handler succeeds.
- Handlers run in no guaranteed order, and they run even when authentication failed, so never assume `context.User` is signed in.

## Resource-based authorization

Attributes and `RequireAuthorization` are evaluated before your endpoint loads any data, so they cannot answer "is this *order* yours?". For that, load the resource and call `IAuthorizationService` yourself (imperative authorization):

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

// ... builder setup:
// .AddPolicy("SameOwner", policy => policy.AddRequirements(new SameOwnerRequirement()));
// builder.Services.AddSingleton<IAuthorizationHandler, OrderOwnerHandler>();

app.MapGet("/orders/{id:int}", async (int id, ClaimsPrincipal user,
    IAuthorizationService authorization, IOrderStore orders) =>
{
    var order = await orders.FindAsync(id);
    if (order is null) return Results.NotFound();

    var result = await authorization.AuthorizeAsync(user, order, "SameOwner");
    return result.Succeeded ? Results.Ok(order) : Results.NotFound();
}).RequireAuthorization();

app.Run();

public sealed record Order(int Id, string CustomerId, decimal Total);
public interface IOrderStore { Task<Order?> FindAsync(int id); }
public sealed class SameOwnerRequirement : IAuthorizationRequirement { }

public sealed class OrderOwnerHandler : AuthorizationHandler<SameOwnerRequirement, Order>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context, SameOwnerRequirement requirement, Order resource)
    {
        if (context.User.FindFirst("sub")?.Value == resource.CustomerId)
        {
            context.Succeed(requirement);
        }
        return Task.CompletedTask;
    }
}
```

The example answers `404` instead of `403` for someone else's order, so a caller cannot probe which ids exist; `Results.Forbid()` is the honest alternative when existence is not a secret. For CRUD-style rules (read for everyone, update for admins, delete for owners) one handler can serve several operations with `OperationAuthorizationRequirement`. Ownership can also be enforced in the query itself (`WHERE CustomerId = @sub`); the important part is that the check exists for every object-level endpoint.

## In practice

- Set a fallback policy that requires an authenticated user, mark public endpoints with `AllowAnonymous()`, and give every write a named policy.
- Name policies after capabilities (`CatalogWriter`, `RefundApprover`), not after roles, so the mapping can change without touching endpoints.
- Every endpoint that takes an id needs an ownership or tenant check. Missing it is **Broken Object Level Authorization**, first in the OWASP API Security Top 10 (2023), and lesson 05 comes back to it.
- Register handlers with a lifetime that matches their dependencies: a handler that uses a `DbContext` must be scoped, not a singleton (the captive dependency from lesson 05/02).
- Common mistakes: `[Authorize(Roles = "Admin")]` against tokens that carry `admin`; expecting a missing `Succeed` to deny when another handler succeeds; checking ownership in the frontend only.

## Check yourself

1. What is the difference between the default policy and the fallback policy, and when does each apply?
2. A policy has two requirements and one of them has two handlers. Write down when the policy passes.
3. Why can't `RequireAuthorization` alone stop customer A from reading customer B's order, and where must that check go?
4. When would you answer `404` instead of `403` for a forbidden record?
