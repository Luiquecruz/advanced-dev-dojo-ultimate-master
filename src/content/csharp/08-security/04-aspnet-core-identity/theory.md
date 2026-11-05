# ASP.NET Core Identity

After this lesson you can add user accounts with passwords to an API using ASP.NET Core Identity, know what its defaults are (hashing, password rules, lockout), use `MapIdentityApi` for a simple SPA or mobile backend, and recognize when you need a real identity provider instead. You will also know what .NET 10 added: passkey support.

You need: 08/01 (cookies, bearer tokens and OpenID Connect), 08/02 (JWT validation), 07/02 (`DbContext`), 07/03 (migrations) and 05/03 (`Configure<TOptions>`).

## What Identity is, and is not

ASP.NET Core Identity is a membership library: tables for users, roles, claims, logins and tokens (`AspNetUsers`, `AspNetRoles` and friends, created by EF Core migrations), plus services that hash passwords, enforce password rules, lock accounts and generate e-mail confirmation and reset tokens.

It is **not** an OAuth 2.0 / OpenID Connect server. It stores users and signs them in to *this* app. It does not issue standard JWT access tokens for other APIs, does not provide single sign-on across apps, and does not implement the authorization code flow for third-party clients. If your plan sounds like "one login for the shop, the admin and the partner portal", you need an identity provider, not Identity alone.

## The building blocks

- `IdentityUser` (or your subclass) is the user entity; `IdentityRole` is optional, added with `.AddRoles<IdentityRole>()`.
- `IdentityDbContext<TUser>` is an EF Core `DbContext` that already maps the Identity tables.
- `UserManager<TUser>` creates users, changes passwords, adds claims and roles.
- `SignInManager<TUser>` checks passwords, applies lockout and two-factor rules, and issues the cookie or token.

The default `PasswordHasher<TUser>` uses PBKDF2 (format `IdentityV3`), and in .NET 10 its `IterationCount` defaults to 100,000. Each hash starts with a format marker, so hashes made with older settings still verify after you raise the cost. A stored hash with fewer iterations than configured returns `PasswordVerificationResult.SuccessRehashNeeded`, and `UserManager` rehashes and saves it with the new count on that user's next successful sign-in.

## Identity API endpoints

For a SPA or mobile app talking to its own backend, .NET 8 added a ready-made set of JSON endpoints:

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Catalog")));
builder.Services.AddAuthorization();
builder.Services.AddIdentityApiEndpoints<IdentityUser>()
    .AddEntityFrameworkStores<AppDbContext>();

var app = builder.Build();

app.MapIdentityApi<IdentityUser>();
app.MapGet("/me", (ClaimsPrincipal user) => user.Identity?.Name).RequireAuthorization();

app.Run();

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<IdentityUser>(options);
```

This needs the `Microsoft.AspNetCore.Identity.EntityFrameworkCore` package and an EF Core provider (here `Npgsql.EntityFrameworkCore.PostgreSQL`). `MapIdentityApi` adds `POST /register`, `POST /login`, `POST /refresh`, `GET /confirmEmail`, `POST /resendConfirmationEmail`, `POST /forgotPassword`, `POST /resetPassword`, `POST /manage/2fa` and `GET`/`POST /manage/info`.

`POST /login` issues a cookie when the query string has `useCookies=true` (persistent) or `useSessionCookies=true`; otherwise it returns an access token and a refresh token, used as `Authorization: Bearer <token>`. Know the limits Microsoft documents:

- The tokens **are not standard JWTs**. They are opaque tokens that only this app can read, chosen on purpose because the Identity API "is meant primarily for simple scenarios" and "isn't intended to be a full-featured identity service provider or token server".
- The access token lives 1 hour (`BearerTokenExpiration`) and the refresh token 14 days (`RefreshTokenExpiration`) by default.
- Signing out clears cookies but does **not** invalidate issued bearer tokens; they stay valid until they expire unless you add server-side revocation.
- There are no endpoints for roles, admin user management or passkeys; you write those with `UserManager`.

## Defaults worth changing

Options are set with `Configure<IdentityOptions>` after the Identity registration:

```csharp
builder.Services.Configure<IdentityOptions>(options =>
{
    options.Password.RequiredLength = 12;               // default 6
    options.Password.RequireNonAlphanumeric = false;    // default true
    options.Lockout.MaxFailedAccessAttempts = 5;        // default 5
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15); // default 5 minutes
    options.User.RequireUniqueEmail = true;             // default false
    options.SignIn.RequireConfirmedEmail = true;        // default false
});
```

By default a password needs six characters with an uppercase letter, a lowercase letter, a digit and a non-alphanumeric character. Six characters is short for an internet-facing shop; teams usually raise the minimum length and settle the composition rules with their security policy. Lockout counts failures only when the sign-in call asks for it: `SignInManager.PasswordSignInAsync(..., lockoutOnFailure: true)`. Code that passes `false`, as the scaffolded `Login` page does, never locks anyone out.

After a security-relevant change (new password, role removed), call `UserManager.UpdateSecurityStampAsync(user)`; cookies are re-validated against the security stamp periodically, which is how "sign out everywhere" works for cookie sessions.

## Passkeys in .NET 10

.NET 10 added passkey support to Identity: sign-in with WebAuthn/FIDO2 credentials (Windows Hello, Touch ID, a phone, a security key) instead of a password. The server stores only a public key, and the credential is bound to the site's domain, so it resists phishing. The scope is deliberately narrow:

- Supported: adding a passkey to an existing account, creating an account with only a passkey, and passwordless sign-in. A passkey is a **primary** factor, not a second factor.
- Only the **Blazor Web App** project template ships the passkey UI. In an API you wire the `SignInManager` passkey methods to your own endpoints.
- Attestation statements are not validated by default. Set `IdentityPasskeyOptions.ServerDomain` (the relying party ID) explicitly, or make sure the host validates the `Host` header, because otherwise the domain is taken from the request.

## Common mistakes

- **Expecting `MapIdentityApi` tokens to work in another API.** They are opaque, not JWTs, so `AddJwtBearer` in a second API rejects every one with `401`. Several APIs sharing users need an identity provider.
- **Calling `PasswordSignInAsync` with `lockoutOnFailure: false`.** Failures are never counted, so a brute-force run never locks the account. Pass `true`.
- **Different errors for "unknown e-mail" and "wrong password".** Attackers learn which accounts exist. Return the same message and status for both.
- **Building an admin screen on `/manage/info`.** It only manages the caller's own account; admin tasks need your own endpoints over `UserManager`, behind an admin policy.

## In practice

| Situation | Choice |
| --- | --- |
| One API with its own SPA or mobile app, its own users | Identity + `MapIdentityApi` (cookies for the SPA on the same site, tokens for mobile) |
| Server-rendered app or Blazor Web App with local accounts | Identity with cookies (and passkeys in .NET 10) |
| Several apps sharing one login, third-party clients, B2B partners | an identity provider issuing OIDC/OAuth tokens; your APIs validate JWTs (lesson 08/02) |
| Staff accounts in Microsoft 365 | Microsoft Entra ID, not local accounts |

When you need an OIDC server you host yourself, options include Duende IdentityServer (which older SPA templates used; Microsoft notes it "might require you to pay a license fee for production use"), OpenIddict and Keycloak. Compare their licences before you commit; this track recommends none of them.

## Status as of 2026-11-05

- .NET 10 is the LTS release, supported until 2028-11-14; passkey support in Identity requires .NET 10 or later.
- The `PasswordHasherOptions.IterationCount` default of 100,000 is the value in the .NET 10 documentation.

## Check yourself

1. Which tables and services does Identity give you, and which job of an OpenID Connect server does it not do?
2. A mobile app signs in through `/login` and gets a token. Why can't your separate reporting API validate that token with `AddJwtBearer`?
3. Lockout is configured with five attempts, yet a brute-force test never locks the account. What do you check first?
4. What does .NET 10 passkey support give you, and what does it leave to you?
