# Authentication Concepts

After this lesson you can say which part of ASP.NET Core answers "who is calling?" and which part answers "may they do this?", pick cookies or tokens for a given client, and name the four OAuth 2.0 roles and what OpenID Connect adds. These ideas sit under every later lesson of the module: JWT bearer (02), policies (03), Identity (04) and hardening (05).

You need: 05/01 (the host and `WebApplication`), 05/05 (middleware order) and 06/01 (minimal API endpoints and `MapGet`).

## Two questions, two services

**Authentication** determines the user's identity. **Authorization** determines whether that user has access to a resource. ASP.NET Core keeps them in separate services: `IAuthenticationService` runs registered *handlers* (cookie, JWT bearer, OpenID Connect), and `IAuthorizationService` evaluates *policies* against the result.

The result of authentication is a `ClaimsPrincipal`: a set of identities, each holding **claims**, which are name-value pairs such as `sub = 42`, `email = ana@example.com` or `role = admin`. A claim describes what the subject *is*; authorization decides what it *can do*.

```csharp
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddAuthentication().AddJwtBearer();
builder.Services.AddAuthorization();

var app = builder.Build();

app.MapGet("/health", () => "ok");                       // public
app.MapGet("/me", (ClaimsPrincipal user) =>
        user.Claims.Select(claim => new { claim.Type, claim.Value }))
    .RequireAuthorization();                             // needs an authenticated user

app.Run();
```

`WebApplication` adds the authentication and authorization middleware for you once those services are registered. You call `UseAuthentication()` and `UseAuthorization()` yourself only to control the order, for example to put CORS before them.

## Schemes, challenge and forbid

A **scheme** is a name bound to one handler and its options: `"Bearer"` for `AddJwtBearer`, `"Cookies"` for `AddCookie`. When only one scheme is registered it becomes the default automatically. With several, you set a default with `AddAuthentication("Bearer")` or name the scheme on the policy.

Each handler also decides how a failure looks:

| Situation | Action | JWT bearer | Cookie |
| --- | --- | --- | --- |
| No valid credentials | **Challenge** | `401` with `WWW-Authenticate: Bearer` | redirect to the login page |
| Valid user, not allowed | **Forbid** | `403` | redirect to an access-denied page |

Since .NET 10, the cookie handler returns `401`/`403` instead of redirecting when the endpoint is a known API endpoint (controllers with `[ApiController]`, minimal APIs that read or write JSON, `TypedResults`). Learn the rule anyway: `401` means "I don't know who you are", `403` means "I know, and the answer is no". Many APIs return `404` instead of `403` for another user's record, so they do not reveal that it exists.

## Cookies or tokens

Both carry proof of a sign-in; they differ in who sends them and what attacks they invite.

- **Cookie**: the browser attaches it automatically to every request to the issuing site. Good for server-rendered apps and for a single-page app served from the same site as its API. Mark it `HttpOnly` and `Secure` so scripts cannot read it. Because the browser sends it automatically, cookie-authenticated endpoints that change state need protection against cross-site request forgery (CSRF): `SameSite` cookies plus antiforgery tokens.
- **Bearer token**: the client puts it in the `Authorization: Bearer <token>` header itself. Good for mobile apps, other services and third-party integrations, and it can be sent to any API that trusts the issuer. No CSRF, because nothing is sent automatically, but whoever holds the token is the user until it expires. Microsoft warns against keeping access tokens in browser `localStorage` or `sessionStorage`, where an XSS bug can steal them; browser apps should keep tokens on a backend and use a secure `HttpOnly` cookie towards it (the backend-for-frontend pattern).

## OAuth 2.0 and OpenID Connect

When users sign in at a central identity provider (Microsoft Entra ID, Auth0, Keycloak, Okta) instead of at your API, you are using OAuth 2.0. RFC 6749 defines four roles:

| Role | Meaning | In your system |
| --- | --- | --- |
| Resource owner | Can grant access to a protected resource | the shopper or the admin user |
| Client | The application calling on the owner's behalf | the SPA, the mobile app, the ERP integration |
| Authorization server | Issues access tokens after authenticating the owner | the identity provider |
| Resource server | Hosts the protected resources and accepts access tokens | **your ASP.NET Core API** |

OAuth 2.0 is about *delegated access*: it says how a client obtains an **access token** for an API. It does not say who the user is. **OpenID Connect (OIDC)** is an identity layer on top of OAuth 2.0: it adds the **ID token**, a JWT that tells the *client* who signed in. Keep them apart: the ID token is for the client and must never be sent to an API; the access token is for the API and the client should not read it.

Which flow gets the token is the client's concern, not the API's. The current guidance: the authorization code flow with PKCE when a user is involved, and the client credentials flow for service-to-service calls with no user. Do not build an endpoint that trades a username and password for an access token (the "password grant"); Microsoft's JWT guidance says explicitly not to.

## Common mistakes

- **Registering authentication and calling the API protected.** `AddAuthentication().AddJwtBearer()` only teaches the app how to read a token. An endpoint without `RequireAuthorization()`, `[Authorize]` or a fallback policy still answers an anonymous caller with `200`. Add authorization metadata or a fallback policy (lesson 08/03).
- **Returning `401` for a permission problem.** The client reads it as "sign in again" and loops through sign-in. Answer `403` (or `404`) when the caller is known but not allowed.
- **Sending the ID token to the API.** It is addressed to the client and carries the client's audience, so a correctly configured API rejects it with `401`. Send the access token.
- **Keeping access tokens in `localStorage`.** Any XSS bug on the page can read and replay them. Keep tokens on a backend and give the browser an `HttpOnly` cookie.

## In practice

- Your API is almost always a **resource server**. It validates tokens that someone else issued (next lesson) and makes authorization decisions (lesson 08/03). Issuing tokens is the identity provider's job.
- Choose by client: cookies for browser apps on your own site, bearer tokens for mobile apps, services and integrations. One API can accept both schemes when it serves both.
- Make protection the default. A fallback policy that requires an authenticated user (lesson 08/03) protects the endpoint someone adds next month and forgets to mark.

## Check yourself

1. In your own words, what is the difference between a claim and a permission?
2. A mobile app, a partner's order system and your admin single-page app (SPA) all call the same catalog API. Which credential would you give each one, and why?
3. Which of the four OAuth 2.0 roles does your API play, and which does it never play?
4. Why does a cookie-authenticated `POST` endpoint need CSRF protection while a bearer-token one does not?
