# JWT Bearer Authentication

After this lesson you can configure an ASP.NET Core API to accept JWT access tokens from an identity provider, say exactly what it checks on each request, test it locally with `dotnet user-jwts`, and avoid the defaults that surprise newcomers: claim mapping, clock skew and tokens that cannot be revoked.

## Coming from PHP/Magento

In Magento 2.4, a client posts credentials to `/V1/integration/admin/token` or `/V1/integration/customer/token` and receives a JWT that Magento itself signed (the `Magento_JwtUserToken` module). Magento is issuer and API at once: it holds the signing key, and it revokes tokens on logout or password change through its own database, which it consults on every request. If you have used `firebase/php-jwt` in a PHP API, you have probably also signed tokens with a shared secret from `env.php` and decoded them in a middleware.

What transfers: the `Authorization: Bearer <token>` header and the idea that a JWT is a signed set of claims with an expiry.

The trap: the usual ASP.NET Core API **does not issue tokens and consults no database about them**. It trusts an external issuer, downloads that issuer's public keys, and validates every token by itself. A JWT is not looked up anywhere, so "log out" does not invalidate it; it stays valid until `exp`. The second trap is copying the PHP habit of one symmetric secret shared by issuer and API: Microsoft says to always use asymmetric keys when creating access tokens.

## What a JWT is

A JWT is three Base64URL-encoded parts separated by dots: `header.payload.signature`. The header names the algorithm and key (`alg`, `kid`), the payload holds the claims, and the signature proves the first two parts were not changed by anyone without the signing key. The payload is **encoded, not encrypted**: anyone holding the token can read it, so never put secrets in claims.

Typical claims of an OAuth 2.0 access token:

| Claim | Meaning |
| --- | --- |
| `iss` | issuer: who created the token |
| `aud` | audience: which API it is for |
| `sub` | subject: the user (or client) it represents |
| `exp`, `nbf`, `iat` | expiry, not-before and issued-at times |
| `scope`, `roles` | what the client was granted, depending on the issuer |

Microsoft's guidance lists what an API must validate: the **signature**, the **issuer**, the **audience** and the **expiry**. If any check fails, the API answers `401`.

## Configuring the handler

The handler lives in the `Microsoft.AspNetCore.Authentication.JwtBearer` package. Pointing it at the issuer is usually enough:

```csharp
using Microsoft.AspNetCore.Authentication.JwtBearer;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Auth:Authority"]; // e.g. https://login.example.com/
        options.Audience = builder.Configuration["Auth:Audience"];   // e.g. catalog-api
        options.MapInboundClaims = false;                           // keep "sub", "role" as sent
        options.TokenValidationParameters.NameClaimType = "sub";    // User.Identity.Name
        options.TokenValidationParameters.RoleClaimType = "role";   // IsInRole, RequireRole
    });
builder.Services.AddAuthorization();

var app = builder.Build();
app.MapGet("/products", () => Results.Ok()).RequireAuthorization();
app.Run();
```

With `Authority` set, the handler reads the issuer's OpenID Connect metadata (`/.well-known/openid-configuration`) at startup, finds the signing keys (the JWKS document) and caches them. That is why the API never needs the issuer's private key: it verifies signatures with the public key. `Audience` makes the handler reject tokens minted for some other API.

You can also configure the scheme from `appsettings.json`: minimal-API apps read options under `Authentication:Schemes:<SchemeName>`, so `Authentication:Schemes:Bearer:ValidAudiences` and `ValidIssuer` configure the default `Bearer` scheme without code.

For non-standard providers, set `TokenValidationParameters` explicitly. Microsoft recommends keeping the defaults where possible:

```csharp
using Microsoft.IdentityModel.Tokens;

// ...
options.TokenValidationParameters = new TokenValidationParameters
{
    ValidateIssuer = true,
    ValidateAudience = true,
    ValidateIssuerSigningKey = true,
    ValidIssuers = ["https://login.example.com/"],
    ValidAudiences = ["catalog-api"],
    ClockSkew = TimeSpan.FromSeconds(30)
};
```

## Defaults that surprise

- **Claim mapping.** By default (`MapInboundClaims = true`) the handler renames well-known short claims to long `ClaimTypes` URIs, so `sub` arrives as `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier`. Code that looks for `"sub"` finds nothing. Choose once per app: either keep the mapping and use the `ClaimTypes` constants, or set `MapInboundClaims = false` and read the claims as the issuer sent them. The second option has a required half: `NameClaimType` and `RoleClaimType` still default to the long URIs, so you must set them to your issuer's short names (`sub` or `name`, and `role`). Without them `User.Identity.Name` is `null` and `IsInRole`, `RequireRole` and `[Authorize(Roles = ...)]` never match, which is what the snippet above avoids.
- **Clock skew.** `TokenValidationParameters.DefaultClockSkew` is 5 minutes, so a token is still accepted for up to five minutes after `exp`. Tests that wait for a one-minute token to expire will "fail" because of it. Lower it if your servers' clocks are synchronized.
- **No revocation.** A stolen or logged-out token keeps working until it expires. Keep access tokens short-lived and let the client renew them through the identity provider; revocation at the API needs extra machinery (introspection or a deny list), which is the identity provider's area.

## Tokens for local development

During development you rarely have an identity provider at hand. The `dotnet user-jwts` tool creates tokens your API will accept. They are signed with a symmetric key (`alg: HS256`), which is acceptable only because the tool is a local test issuer; it is not a model for production signing:

```bash
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet user-jwts create                                  # a token for your OS user
dotnet user-jwts create --name ana --role admin          # with a role claim
dotnet user-jwts create --scope "catalog:write"          # with a scope claim
dotnet user-jwts print <id> --show-all                   # decode it
curl -i -H "Authorization: Bearer <token>" https://localhost:7076/products
```

It stores its signing key with the Secret Manager in your user profile and writes `Authentication:Schemes:Bearer` (`ValidAudiences` from `launchSettings.json`, `ValidIssuer: dotnet-user-jwts`) into `appsettings.Development.json`. That is why the default `AddJwtBearer()` with no options accepts the tokens in Development and nowhere else. The project P4 uses exactly this tool for its `401`/`403` checks.

## In practice

- Treat the API as a token **validator**. Configure `Authority` and `Audience`, keep the signature, issuer, audience and lifetime checks on, and let an identity provider issue tokens. Microsoft limits self-created tokens to test scenarios.
- Never switch validation off to "make the token work" (`ValidateIssuerSigningKey = false`, `ValidateLifetime = false`). Fix the configuration instead: the usual causes are a wrong audience, a trailing slash in the issuer, or a token meant for another API.
- Pick one claim-mapping style and use it everywhere; mixed styles cause authorization checks that silently never match.
- Read failure reasons in the logs rather than guessing: the handler logs why validation failed (expired, bad signature, wrong audience) at `Information` level under the `Microsoft.AspNetCore.Authentication` category. The default `"Microsoft.AspNetCore": "Warning"` setting in `appsettings.json` hides them, so add `"Microsoft.AspNetCore.Authentication": "Information"` to `Logging:LogLevel` while diagnosing. The `401` response itself says little on purpose.
- If an API accepts tokens from several issuers, register one named scheme per issuer and a policy scheme (`AddPolicyScheme`) that picks between them.

## Check yourself

1. Which four properties of a token must the API validate, and what does each one protect against?
2. Why can the API verify a token's signature without ever holding the identity provider's private key?
3. A teammate's policy checks `context.User.FindFirst("sub")` and always fails. What is the likely cause, and what are the two fixes?
4. A user logs out of the SPA. Why can an attacker who copied the access token still call the API, and what limits the damage?
