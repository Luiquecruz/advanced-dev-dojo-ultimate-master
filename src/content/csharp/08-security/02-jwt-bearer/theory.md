# JWT Bearer Authentication

After this lesson you can configure an ASP.NET Core API to accept JWT access tokens from an identity provider, say exactly what it checks on each request, read a token's claims yourself, test the API locally with `dotnet user-jwts`, and avoid the defaults that surprise newcomers: claim mapping, clock skew and tokens that cannot be revoked.

You need: 08/01 (claims, schemes and the resource-server role), 05/03 (configuration from `appsettings.json`), 05/04 (log categories and levels) and 04/01 (exceptions such as `FormatException`).

## What a JWT is

A JWT is three Base64URL-encoded parts separated by dots: `header.payload.signature`. The header names the algorithm and key (`alg`, `kid`), the payload holds the claims as JSON, and the signature proves the first two parts were not changed by anyone without the signing key. The payload is **encoded, not encrypted**: anyone holding the token can read it, so never put secrets in claims.

Typical claims of an OAuth 2.0 access token:

| Claim | Meaning |
| --- | --- |
| `iss` | issuer: who created the token |
| `aud` | audience: which API it is for |
| `sub` | subject: the user (or client) it represents |
| `exp`, `nbf`, `iat` | expiry, not-before and issued-at times |
| `scope`, `roles` | what the client was granted, depending on the issuer |

Microsoft's guidance lists what an API must validate: the **signature**, the **issuer**, the **audience** and the **expiry**. If any check fails, the API answers `401`.

The usual API **does not issue tokens and stores nothing about them**. It trusts an external issuer, downloads that issuer's public keys and validates every token by itself, which is also why it cannot "log a token out".

## Reading a token by hand

Decoding a token yourself shows what the handler checks. Base64URL is Base64 made safe for URLs: `-` and `_` replace `+` and `/`, and the trailing `=` padding is dropped. `Convert.FromBase64String` expects the standard alphabet with padding, so it throws `FormatException` on many segments; .NET 9 added `Base64Url` for the URL variant.

```csharp
using System.Buffers.Text;
using System.Text.Json;

string[] parts = token.Split('.');
if (parts.Length != 3) throw new FormatException("A JWT has three parts.");

using JsonDocument payload = JsonDocument.Parse(Base64Url.DecodeFromChars(parts[1]));
JsonElement claims = payload.RootElement;

string? issuer = claims.GetProperty("iss").GetString();
DateTimeOffset expires = DateTimeOffset.FromUnixTimeSeconds(claims.GetProperty("exp").GetInt64());
string? subject = claims.TryGetProperty("sub", out JsonElement sub) ? sub.GetString() : null;

var audiences = new List<string>();
if (claims.TryGetProperty("aud", out JsonElement aud))
{
    if (aud.ValueKind == JsonValueKind.Array)
        foreach (JsonElement item in aud.EnumerateArray()) audiences.Add(item.GetString()!);
    else
        audiences.Add(aud.GetString()!);
}
```

`GetProperty` throws `KeyNotFoundException` for a missing claim; `TryGetProperty` returns `false`, which suits optional claims. `Parse` throws `JsonException` when the payload is not valid JSON. Times are NumericDate seconds since the Unix epoch, and `aud` is one string or an array (RFC 7519). None of this verifies the signature: until it passes, every claim is text anyone could have written.

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

With `Authority` set, the handler reads the issuer's OpenID Connect metadata (`/.well-known/openid-configuration`) at startup, finds the signing keys (the JWKS document) and caches them. That is why the API never needs the issuer's private key: it verifies signatures with the public key. `Audience` makes the handler reject tokens minted for some other API. Microsoft says to always use asymmetric keys for access tokens, so issuer and API never share a secret.

You can also configure the scheme from `appsettings.json`: minimal-API apps read options under `Authentication:Schemes:<SchemeName>`, so `Authentication:Schemes:Bearer:ValidAudiences` and `ValidIssuer` configure the default `Bearer` scheme without code. For non-standard providers, set `TokenValidationParameters` (`ValidIssuers`, `ValidAudiences`, `ClockSkew`) explicitly; Microsoft recommends keeping the other defaults.

## Defaults that surprise

- **Claim mapping.** By default (`MapInboundClaims = true`) the handler renames well-known short claims to long `ClaimTypes` URIs, so `sub` arrives as `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier`. Choose once per app: keep the mapping and use the `ClaimTypes` constants, or set `MapInboundClaims = false` and read the claims as the issuer sent them. The second option has a required half: `NameClaimType` and `RoleClaimType` still default to the long URIs, so set them to your issuer's short names, as the snippet above does. Without them `User.Identity.Name` is `null` and `IsInRole`, `RequireRole` and `[Authorize(Roles = ...)]` never match.
- **Clock skew.** `TokenValidationParameters.DefaultClockSkew` is 5 minutes: a token counts as expired only when `exp` is more than five minutes in the past, and as not yet valid only when `nbf` is more than five minutes in the future. Lower it when server clocks are synchronized.
- **No revocation.** A stolen or logged-out token keeps working until it expires. Keep access tokens short-lived and let the client renew them through the identity provider; revocation at the API needs extra machinery (introspection or a deny list), which is the identity provider's area.

## Tokens for local development

During development you rarely have an identity provider at hand. The `dotnet user-jwts` tool creates tokens your API will accept. They are signed with a symmetric key (`alg: HS256`), acceptable only because the tool is a local test issuer:

```bash
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet user-jwts create                                  # a token for your OS user
dotnet user-jwts create --name ana --role admin          # with a role claim
dotnet user-jwts create --scope "catalog:write"          # with a scope claim
dotnet user-jwts print <id> --show-all                   # decode it
curl -i -H "Authorization: Bearer <token>" https://localhost:7076/products
```

It stores its signing key with the Secret Manager in your user profile and writes `Authentication:Schemes:Bearer` (`ValidAudiences` from `launchSettings.json`, `ValidIssuer: dotnet-user-jwts`) into `appsettings.Development.json`. That is why the default `AddJwtBearer()` with no options accepts the tokens in Development and nowhere else; project P4 relies on it.

## Common mistakes

- **Decoding a segment with `Convert.FromBase64String`.** A segment with `-`, `_` or no padding throws `FormatException`. Use `Base64Url`, or swap the characters back and re-pad first.
- **Switching validation off to "make the token work".** `ValidateIssuer = false`, `ValidateAudience = false` or `ValidateLifetime = false` makes tokens for other APIs, or long-expired ones, pass. Fix the cause instead: usually a wrong audience, a trailing slash in the issuer, or a token meant for another API.
- **Reading `"sub"` with the default claim mapping.** `FindFirst("sub")` returns `null` because the claim was renamed, so the check silently never matches. Pick one mapping style for the whole app.
- **Trusting claims you decoded yourself.** Without the signature check, anyone can write `"role": "admin"` into a payload. Let the handler validate before any claim is believed.

## In practice

- Treat the API as a token **validator**. Configure `Authority` and `Audience`, keep the signature, issuer, audience and lifetime checks on, and let an identity provider issue tokens. Microsoft limits self-created tokens to test scenarios.
- Read failure reasons in the logs: the handler logs why validation failed (expired, bad signature, wrong audience) at `Information` level under the `Microsoft.AspNetCore.Authentication` category. The default `"Microsoft.AspNetCore": "Warning"` setting hides them, so add `"Microsoft.AspNetCore.Authentication": "Information"` to `Logging:LogLevel` while diagnosing.

## Check yourself

1. Which four properties of a token must the API validate, and what does each one protect against?
2. Why can the API verify a token's signature without ever holding the identity provider's private key?
3. A teammate's policy checks `context.User.FindFirst("sub")` and always fails. What is the likely cause, and what are the two fixes?
4. A user logs out of the SPA. Why can an attacker who copied the access token still call the API, and what limits the damage?
